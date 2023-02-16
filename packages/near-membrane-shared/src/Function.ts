import { ERR_ILLEGAL_PROPERTY_ACCESS, LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL } from './constants';
import { TypeErrorCtor } from './Error';
import { ProxyCtor } from './Proxy';
import {
    ReflectApply,
    ReflectConstruct,
    ReflectDefineProperty,
    ReflectDeleteProperty,
    ReflectGet,
    ReflectGetOwnPropertyDescriptor,
    ReflectGetPrototypeOf,
    ReflectHas,
    ReflectIsExtensible,
    ReflectOwnKeys,
    ReflectPreventExtensions,
    ReflectSet,
    ReflectSetPrototypeOf,
} from './Reflect';
import type { ProxyTarget, ProxyTrapInvokers } from './types';
// Import `const enum ProxyHandlerTraps` as a value, instead of a type,
// so TypeScript will convert it to its corresponding number literal and remove
// references to the enum from the generated JavaScript.
import { ProxyHandlerTraps } from './types';

export function isProxyMaskedFunction(value: any): boolean {
    // To extract the flag value of a blue near-membrane proxy we must perform
    // a two step handshake. First, we trigger the "has" trap for the
    // `LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL` property which must report
    // `false`. Second, we trigger the "get" trap to return the flag value.
    return (
        typeof value === 'function' &&
        !(LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL in value) &&
        (value as any)[LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL] === true
    );
}

export function noop() {
    // No operation performed.
}

export function proxyMaskFunction<T extends Function>(
    func: Function,
    maskFunc: T,
    trapInvokers?: ProxyTrapInvokers
): T {
    let applyTrapInvoker = ReflectApply;
    let constructTrapInvoker = ReflectConstruct;
    let definePropertyTrapInvoker = ReflectDefineProperty;
    let getTrapInvoker = (ReflectGet as ProxyTrapInvokers['get'])!;
    let getOwnPropertyDescriptorTrapInvoker = ReflectGetOwnPropertyDescriptor;
    let hasTrapInvoker = ReflectHas;
    let setTrapInvoker = ReflectSet;
    if (trapInvokers) {
        ({
            apply: applyTrapInvoker = ReflectApply,
            construct: constructTrapInvoker = ReflectConstruct,
            defineProperty: definePropertyTrapInvoker = ReflectDefineProperty,
            get: getTrapInvoker = (ReflectGet as ProxyTrapInvokers['get'])!,
            getOwnPropertyDescriptor:
                getOwnPropertyDescriptorTrapInvoker = ReflectGetOwnPropertyDescriptor,
            has: hasTrapInvoker = ReflectHas,
            set: setTrapInvoker = ReflectSet,
        } = trapInvokers);
    }
    let handshakeFlag = false;
    let handshakeProxyMaskedFlag = false;
    let lastProxyTrapCalled = ProxyHandlerTraps.None;
    const proxy = new ProxyCtor(maskFunc, {
        apply(_target: T, thisArg: any, args: any[]) {
            lastProxyTrapCalled = ProxyHandlerTraps.Apply;
            if (thisArg === proxy || thisArg === maskFunc) {
                thisArg = func;
            }
            return applyTrapInvoker(func, thisArg, args);
        },
        construct(_target: T, args: any[], newTarget: Function) {
            lastProxyTrapCalled = ProxyHandlerTraps.Construct;
            if (newTarget === proxy || newTarget === maskFunc) {
                newTarget = func;
            }
            return constructTrapInvoker(func, args, newTarget);
        },
        defineProperty(target: ProxyTarget, key: PropertyKey, desc: PropertyDescriptor) {
            lastProxyTrapCalled = ProxyHandlerTraps.DefineProperty;
            // Defining forgeries of handshake properties is not allowed.
            if (key === LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL) {
                throw new TypeErrorCtor(ERR_ILLEGAL_PROPERTY_ACCESS);
            }
            return definePropertyTrapInvoker(target, key, desc);
        },
        deleteProperty(target: ProxyTarget, key: PropertyKey) {
            lastProxyTrapCalled = ProxyHandlerTraps.GetOwnPropertyDescriptor;
            return ReflectDeleteProperty(target, key);
        },
        get(target: ProxyTarget, key: PropertyKey, receiver: any) {
            // Only allow accessing handshake property values if the "has"
            // trap has been triggered immediately BEFORE and the property does
            // NOT exist.
            handshakeFlag &&= lastProxyTrapCalled === ProxyHandlerTraps.Has;
            handshakeProxyMaskedFlag &&= handshakeFlag;
            lastProxyTrapCalled = ProxyHandlerTraps.Get;
            const isProxyMaskedSymbol = key === LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL;
            if (handshakeProxyMaskedFlag) {
                // Exit without performing a [[Get]] for
                // `LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL` properties
                // because we know that when the `handshakeProxyMaskedFlag`
                // is ON that there are NO shadowed values.
                if (isProxyMaskedSymbol) {
                    return true;
                }
            }
            const result = getTrapInvoker(target, key, receiver, handshakeFlag);
            // Getting forged values of handshake properties is not allowed.
            if (result !== undefined && isProxyMaskedSymbol) {
                throw new TypeErrorCtor(ERR_ILLEGAL_PROPERTY_ACCESS);
            }
            return result;
        },
        getOwnPropertyDescriptor(target: ProxyTarget, key: PropertyKey) {
            lastProxyTrapCalled = ProxyHandlerTraps.GetOwnPropertyDescriptor;
            const result = getOwnPropertyDescriptorTrapInvoker(target, key);
            // Getting forged descriptors of handshake properties is not allowed.
            if (result && key === LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL) {
                throw new TypeErrorCtor(ERR_ILLEGAL_PROPERTY_ACCESS);
            }
            return result;
        },
        getPrototypeOf(target: ProxyTarget) {
            lastProxyTrapCalled = ProxyHandlerTraps.GetPrototypeOf;
            return ReflectGetPrototypeOf(target);
        },
        has(target: ProxyTarget, key: PropertyKey) {
            lastProxyTrapCalled = ProxyHandlerTraps.Has;
            const result = hasTrapInvoker(target, key);
            const isProxyMaskedSymbol = key === LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL;
            if (result) {
                handshakeFlag = false;
                // Checking the existence of forged handshake properties is not allowed.
                if (isProxyMaskedSymbol) {
                    throw new TypeErrorCtor(ERR_ILLEGAL_PROPERTY_ACCESS);
                }
            } else {
                // The `handshakeFlag` is ON if the handshake property does NOT
                // exist on the object or its [[Prototype]].
                handshakeFlag = true;
                handshakeProxyMaskedFlag = isProxyMaskedSymbol;
            }
            return result;
        },
        isExtensible(target: ProxyTarget) {
            lastProxyTrapCalled = ProxyHandlerTraps.IsExtensible;
            return ReflectIsExtensible(target);
        },
        ownKeys(target: ProxyTarget) {
            lastProxyTrapCalled = ProxyHandlerTraps.OwnKeys;
            return ReflectOwnKeys(target);
        },
        preventExtensions(target: ProxyTarget) {
            lastProxyTrapCalled = ProxyHandlerTraps.PreventExtensions;
            return ReflectPreventExtensions(target);
        },
        set(target: ProxyTarget, key: PropertyKey, value: any, receiver: any) {
            lastProxyTrapCalled = ProxyHandlerTraps.Set;
            // Setting forged values of handshake properties is not allowed.
            if (key === LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL) {
                throw new TypeErrorCtor(ERR_ILLEGAL_PROPERTY_ACCESS);
            }
            return setTrapInvoker(target, key, value, receiver);
        },
        setPrototypeOf(target: ProxyTarget, proto: object | null) {
            lastProxyTrapCalled = ProxyHandlerTraps.SetPrototypeOf;
            return ReflectSetPrototypeOf(target, proto);
        },
    }) as T;
    return proxy;
}
