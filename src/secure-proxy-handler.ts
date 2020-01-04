/**
 * This file implements a serializable factory function that is invoked once per sandbox
 * and it is used to create secure proxy handlers where all identities are defined inside
 * the sandbox, this guarantees that any error when interacting with those proxies, has
 * the proper identity to avoid leaking references from the outer realm into the sandbox
 * this is especially important for out of memory errors.
 *
 * IMPORTANT:
 *  - This file can't import anything from the package, only types since it is going to
 *    be serialized, and therefore it will loose the reference.
 */
import {
    SecureEnvironment,
} from './environment';
import {
    SecureProxyTarget,
    SecureValue,
    SecureObject,
    SecureShadowTarget,
    RawConstructor,
    RawFunction,
} from './membrane';
import { TargetMeta } from './membrane';

export const serializedSecureProxyHandlerFactory = (function secureProxyHandlerFactory(env: SecureEnvironment) {
    'use strict';

    const {
        apply,
        construct,
        isExtensible,
        getOwnPropertyDescriptor,
        setPrototypeOf,
        getPrototypeOf,
        preventExtensions,
        deleteProperty,
        ownKeys,
        defineProperty,
    } = Reflect;
    const { seal, freeze, defineProperty: ObjectDefineProperty, create, assign, hasOwnProperty } = Object;
    const emptyArray: [] = [];

    function isUndefined(obj: any): obj is undefined {
        return obj === undefined;
    }

    function isFunction(obj: any): obj is Function {
        return typeof obj === 'function';
    }

    function installDescriptorIntoShadowTarget(shadowTarget: SecureProxyTarget, key: PropertyKey, originalDescriptor: PropertyDescriptor) {
        const shadowTargetDescriptor = getOwnPropertyDescriptor(shadowTarget, key);
        if (!isUndefined(shadowTargetDescriptor)) {
            if (hasOwnProperty.call(shadowTargetDescriptor, 'configurable') &&
                    shadowTargetDescriptor.configurable === true) {
                defineProperty(shadowTarget, key, originalDescriptor);
            } else if (hasOwnProperty.call(shadowTargetDescriptor, 'writable') &&
                    shadowTargetDescriptor.writable === true) {
                // just in case
                shadowTarget[key] = originalDescriptor.value;
            } else {
                // ignoring... since it is non configurable and non-writable
                // usually, arguments, callee, etc.
            }
        } else {
            defineProperty(shadowTarget, key, originalDescriptor);
        }
    }

    function getSecureDescriptor(descriptor: PropertyDescriptor): PropertyDescriptor {
        const secureDescriptor = assign(create(null), descriptor);
        const { value, get, set } = secureDescriptor;
        if ('writable' in secureDescriptor) {
            // we are dealing with a value descriptor
            secureDescriptor.value = isFunction(value) ?
                // we are dealing with a method (optimization)
                env.getSecureFunction(value) : env.getSecureValue(value);
        } else {
            // we are dealing with accessors
            if (isFunction(set)) {
                secureDescriptor.set = env.getSecureFunction(set);
            }
            if (isFunction(get)) {
                secureDescriptor.get = env.getSecureFunction(get);
            }
        }
        return secureDescriptor;
    }

    // equivalent to Object.getOwnPropertyDescriptor, but looks into the whole proto chain
    function getPropertyDescriptor(o: any, p: PropertyKey): PropertyDescriptor | undefined {
        do {
            const d = getOwnPropertyDescriptor(o, p);
            if (!isUndefined(d)) {
                setPrototypeOf(d, null);
                return d;
            }
            o = getPrototypeOf(o);
        } while (o !== null);
        return undefined;
    }

    function copySecureOwnDescriptors(shadowTarget: SecureShadowTarget, descriptors: PropertyDescriptorMap) {
        for (const key in descriptors) {
            // avoid poisoning by checking own properties from descriptors
            if (hasOwnProperty.call(descriptors, key)) {
                const originalDescriptor = getSecureDescriptor(descriptors[key]);
                installDescriptorIntoShadowTarget(shadowTarget, key, originalDescriptor);
            }
        }
    }

    return function createSecureProxyHandler(target: SecureProxyTarget, meta: TargetMeta): ProxyHandler<SecureProxyTarget> {

        // initialization used to avoid the initialization cost
        // of an object graph, we want to do it when the
        // first interaction happens.
        let initialize = function (shadowTarget: SecureShadowTarget) {
            // once the initialization is executed once... the rest is just noop
            initialize = () => undefined;
            // adjusting the proto chain of the shadowTarget (recursively)
            const secProto = env.getSecureValue(meta.proto);
            setPrototypeOf(shadowTarget, secProto);
            // defining own descriptors
            copySecureOwnDescriptors(shadowTarget, meta.descriptors);
            // preserving the semantics of the object
            if (meta.isFrozen) {
                freeze(shadowTarget);
            } else if (meta.isSealed) {
                seal(shadowTarget);
            } else if (!meta.isExtensible) {
                preventExtensions(shadowTarget);
            }
        }

        // future optimization: hoping that proxies with frozen handlers can be faster
        return freeze({
            get(shadowTarget: SecureShadowTarget, key: PropertyKey, receiver: SecureObject): SecureValue {
                initialize(shadowTarget);
                const desc = getPropertyDescriptor(shadowTarget, key);
                if (isUndefined(desc)) {
                    return desc;
                }
                const { get } = desc;
                if (isFunction(get)) {
                    // calling the getter with the secure receiver because the getter expects a secure value
                    // it also returns a secure value
                    return apply(get, receiver, emptyArray);
                }
                return desc.value;
            },
            set(shadowTarget: SecureShadowTarget, key: PropertyKey, value: SecureValue, receiver: SecureObject): boolean {
                initialize(shadowTarget);
                const shadowTargetDescriptor = getPropertyDescriptor(shadowTarget, key);
                if (!isUndefined(shadowTargetDescriptor)) {
                    // descriptor exists in the shadowTarget or proto chain
                    const { set, get, writable } = shadowTargetDescriptor;
                    if (writable === false) {
                        // TypeError: Cannot assign to read only property '${key}' of object
                        return false;
                    }
                    if (typeof set === 'function') {
                        // a setter is available, just call it with the secure value because
                        // the setter expects a secure value
                        apply(set, receiver, [value]);
                        return true;
                    }
                    if (typeof get === 'function') {
                        // a getter without a setter should fail to set in strict mode
                        // TypeError: Cannot set property ${key} of object which has only a getter
                        return false;
                    }
                } else if (!isExtensible(shadowTarget)) {
                    // non-extensible should throw in strict mode
                    // TypeError: Cannot add property ${key}, object is not extensible
                    return false;
                }
                // the descriptor is writable on the obj or proto chain, just assign it
                shadowTarget[key] = value;
                return true;
            },
            deleteProperty(shadowTarget: SecureShadowTarget, key: PropertyKey): boolean {
                initialize(shadowTarget);
                return deleteProperty(shadowTarget, key);
            },
            apply(shadowTarget: SecureShadowTarget, thisArg: SecureValue, argArray: SecureValue[]): SecureValue {
                try {
                    initialize(shadowTarget);
                    const rawThisArg = env.getRawValue(thisArg);
                    const rawArgArray = env.getRawArray(argArray);
                    const raw = apply(target as RawFunction, rawThisArg, rawArgArray);
                    return env.getSecureValue(raw);
                } catch (e) {
                    // by throwing a new secure error, we prevent stack overflow errors
                    // from outer realm to leak into the sandbox
                    throw e;
                }
            },
            construct(shadowTarget: SecureShadowTarget, argArray: SecureValue[], newTarget: SecureObject): SecureObject {
                try {
                    initialize(shadowTarget);
                    if (isUndefined(newTarget)) {
                        throw TypeError();
                    }
                    const rawArgArray = env.getRawArray(argArray);
                    const rawNewTarget = env.getRawValue(newTarget);
                    const raw = construct(target as RawConstructor, rawArgArray, rawNewTarget);
                    return env.getSecureValue(raw);
                } catch (e) {
                    // by throwing a new secure error, we prevent stack overflow errors
                    // from outer realm to leak into the sandbox
                    throw e;
                }
            },
            has(shadowTarget: SecureShadowTarget, key: PropertyKey): boolean {
                initialize(shadowTarget);
                return key in shadowTarget;
            },
            ownKeys(shadowTarget: SecureShadowTarget): PropertyKey[] {
                initialize(shadowTarget);
                return ownKeys(shadowTarget);
            },
            isExtensible(shadowTarget: SecureShadowTarget): boolean {
                initialize(shadowTarget);
                // No DOM API is non-extensible, but in the sandbox, the author
                // might want to make them non-extensible
                return isExtensible(shadowTarget);
            },
            getOwnPropertyDescriptor(shadowTarget: SecureShadowTarget, key: PropertyKey): PropertyDescriptor | undefined {
                initialize(shadowTarget);
                // TODO: this is leaking outer realm's object
                return getOwnPropertyDescriptor(shadowTarget, key);
            },
            getPrototypeOf(shadowTarget: SecureShadowTarget): SecureValue {
                initialize(shadowTarget);
                // nothing to be done here since the shadowTarget must have the right proto chain
                return getPrototypeOf(shadowTarget);
            },
            setPrototypeOf(shadowTarget: SecureShadowTarget, prototype: SecureValue): boolean {
                initialize(shadowTarget);
                // this operation can only affect the env object graph
                return setPrototypeOf(shadowTarget, prototype);
            },
            preventExtensions(shadowTarget: SecureShadowTarget): boolean {
                initialize(shadowTarget);
                // this operation can only affect the env object graph
                return preventExtensions(shadowTarget);
            },
            defineProperty(shadowTarget: SecureShadowTarget, key: PropertyKey, descriptor: PropertyDescriptor): boolean {
                initialize(shadowTarget);
                // this operation can only affect the env object graph
                // intentionally using Object.defineProperty instead of Reflect.defineProperty
                // to throw for existing non-configurable descriptors.
                ObjectDefineProperty(shadowTarget, key, descriptor);
                return true;
            },
        });

    };
}).toString();