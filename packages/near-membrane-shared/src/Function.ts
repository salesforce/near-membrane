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

export function noop() {
    // No operation performed.
}

export function proxyMaskFunction<T extends Function>(
    func: Function,
    maskFunc: T,
    trapInvokers?: ProxyTrapInvokers
): T {
    let nearMembraneSymbolFlag = false;
    let lastProxyTrapCalled = ProxyHandlerTraps.None;
    let applyTrapInvoker = ReflectApply;
    let constructTrapInvoker = ReflectConstruct;
    let getTrapInvoker = (ReflectGet as ProxyTrapInvokers['get'])!;
    let hasTrapInvoker = ReflectHas;
    if (trapInvokers) {
        ({
            apply: applyTrapInvoker = ReflectApply,
            construct: constructTrapInvoker = ReflectConstruct,
            get: getTrapInvoker = (ReflectGet as ProxyTrapInvokers['get'])!,
            has: hasTrapInvoker = ReflectHas,
        } = trapInvokers);
    }
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
            // Defining forgeries of `LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL`
            // properties is not allowed.
            if (key === LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL) {
                throw new TypeErrorCtor(ERR_ILLEGAL_PROPERTY_ACCESS);
            }
            return ReflectDefineProperty(target, key, desc);
        },
        deleteProperty(target: ProxyTarget, key: PropertyKey) {
            lastProxyTrapCalled = ProxyHandlerTraps.GetOwnPropertyDescriptor;
            return ReflectDeleteProperty(target, key);
        },
        get(target: ProxyTarget, key: PropertyKey, receiver: any) {
            // Only allow accessing near-membrane symbol values if the
            // BoundaryProxyHandler.has trap has been called immediately before
            // and the symbol does not exist.
            nearMembraneSymbolFlag &&= lastProxyTrapCalled === ProxyHandlerTraps.Has;
            lastProxyTrapCalled = ProxyHandlerTraps.Get;
            const isProxyMaskedSymbol = key === LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL;
            if (nearMembraneSymbolFlag) {
                // Exit without performing a [[Get]] for near-membrane symbols
                // because we know when the nearMembraneSymbolFlag is ON that
                // there is no shadowed symbol value.
                if (isProxyMaskedSymbol) {
                    return true;
                }
            }
            const result = getTrapInvoker(target, key, receiver, nearMembraneSymbolFlag);
            // Getting forged values of `LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL`
            // properties is not allowed.
            if (result !== undefined && isProxyMaskedSymbol) {
                throw new TypeErrorCtor(ERR_ILLEGAL_PROPERTY_ACCESS);
            }
            return result;
        },
        getOwnPropertyDescriptor(target: ProxyTarget, key: PropertyKey) {
            lastProxyTrapCalled = ProxyHandlerTraps.GetOwnPropertyDescriptor;
            const result = ReflectGetOwnPropertyDescriptor(target, key);
            // Getting forged descriptors of `LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL`
            // properties is not allowed.
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
                nearMembraneSymbolFlag = false;
                // Checking the existence of forged `LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL`
                // properties is not allowed.
                if (isProxyMaskedSymbol) {
                    throw new TypeErrorCtor(ERR_ILLEGAL_PROPERTY_ACCESS);
                }
            } else {
                // The near-membrane symbol flag is on if the symbol does
                // not exist on the object or its [[Prototype]].
                nearMembraneSymbolFlag = isProxyMaskedSymbol;
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
            // Setting forged values of `LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL`
            // properties is not allowed.
            if (key === LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL) {
                throw new TypeErrorCtor(ERR_ILLEGAL_PROPERTY_ACCESS);
            }
            return ReflectSet(target, key, value, receiver);
        },
        setPrototypeOf(target: ProxyTarget, proto: object | null) {
            lastProxyTrapCalled = ProxyHandlerTraps.SetPrototypeOf;
            return ReflectSetPrototypeOf(target, proto);
        },
    }) as T;
    return proxy;
}
