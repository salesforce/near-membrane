import {
    apply,
    assign,
    construct,
    deleteProperty,
    isUndefined,
    ObjectCreate,
    ReflectDefineProperty,
    ReflectSetPrototypeOf,
    ReflectGetPrototypeOf,
    ReflectIsExtensible,
    ReflectGetOwnPropertyDescriptor,
    ownKeys,
    ReflectPreventExtensions,
    isFunction,
    getOwnPropertyDescriptors,
    freeze,
    isTrue,
    emptyArray,
    hasOwnProperty,
    isSealed,
    isFrozen,
    seal,
} from './shared';
import {
    SecureEnvironment,
    SecureProxyTarget,
    SecureValue,
    SecureObject,
    RawConstructor,
    RawFunction,
    SecureShadowTarget,
    RawValue,
} from './environment';

export function getSecureDescriptor(descriptor: PropertyDescriptor, env: SecureEnvironment): PropertyDescriptor {
    const secureDescriptor = assign(ObjectCreate(null), descriptor);
    const { value, get, set } = secureDescriptor;
    if ('writable' in secureDescriptor) {
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
        const d = ReflectGetOwnPropertyDescriptor(o, p);
        if (!isUndefined(d)) {
            ReflectSetPrototypeOf(d, null);
            return d;
        }
        o = ReflectGetPrototypeOf(o);
    } while (o !== null);
    return undefined;
}

function copySecureOwnDescriptors(env: SecureEnvironment, shadowTarget: SecureShadowTarget, target: SecureProxyTarget) {
    // TODO: typescript definition for getOwnPropertyDescriptors is wrong, it should include symbols
    const descriptors = callWithErrorBoundaryProtection(env, () => {
        return getOwnPropertyDescriptors(target);
    });
    for (const key in descriptors) {
        // avoid poisoning by checking own properties from descriptors
        if (hasOwnProperty(descriptors, key)) {
            const originalDescriptor = getSecureDescriptor(descriptors[key], env);
            const shadowTargetDescriptor = ReflectGetOwnPropertyDescriptor(shadowTarget, key);
            if (!isUndefined(shadowTargetDescriptor)) {
                if (hasOwnProperty(shadowTargetDescriptor, 'configurable') &&
                        isTrue(shadowTargetDescriptor.configurable)) {
                    ReflectDefineProperty(shadowTarget, key, originalDescriptor);
                } else if (hasOwnProperty(shadowTargetDescriptor, 'writable') &&
                        isTrue(shadowTargetDescriptor.writable)) {
                    // just in case
                    shadowTarget[key] = originalDescriptor.value;
                } else {
                    // ignoring... since it is non configurable and non-writable
                    // usually, arguments, callee, etc.
                }
            } else {
                ReflectDefineProperty(shadowTarget, key, originalDescriptor);
            }
        }
    }
}

function callWithErrorBoundaryProtection(env: SecureEnvironment, fn: () => RawValue): RawValue {
    let result;
    try {
        result = fn();
    } catch (rawError) {
        // This error occurred when a sandbox attempted to invoke a function,
        // setter, getter, or any other operation on the outer realm.
        // TODO: what should we do with this error?
        //       by default, it will be just proxy it, but the stack and everything
        //       from the original error will be accessible into the sandbox, although
        //       no object identity will be leaked.
        throw rawError;
    }
    return result;
}

const noop = () => undefined;

/**
 * identity preserved through this membrane:
 *  - symbols
 */
export class SecureProxyHandler implements ProxyHandler<SecureProxyTarget> {
    // original target for the proxy
    private readonly target: SecureProxyTarget;
    // environment object that controls the realm
    private readonly env: SecureEnvironment;

    constructor(env: SecureEnvironment, target: SecureProxyTarget) {
        this.target = target;
        this.env = env;
    }
    // initialization used to avoid the initialization cost
    // of an object graph, we want to do it when the
    // first interaction happens.
    private initialize(shadowTarget: SecureShadowTarget) {
        const { target, env } = this;
        // adjusting the proto chain of the shadowTarget (recursively)
        const rawProto = callWithErrorBoundaryProtection(env, () => {
            return ReflectGetPrototypeOf(target);
        });
        ReflectSetPrototypeOf(shadowTarget, env.getSecureValue(rawProto));
        // defining own descriptors
        copySecureOwnDescriptors(env, shadowTarget, target);
        // preserving the semantics of the object
        if (isFrozen(target)) {
            freeze(shadowTarget);
        } else if (isSealed(target)) {
            seal(shadowTarget);
        } else if (!ReflectIsExtensible(target)) {
            ReflectPreventExtensions(shadowTarget);
        }
        // once the initialization is executed once... the rest is just noop 
        this.initialize = noop;
        // future optimization: hoping that proxies with frozen handlers can be faster
        freeze(this);
    }

    get(shadowTarget: SecureShadowTarget, key: PropertyKey, receiver: SecureObject): SecureValue {
        this.initialize(shadowTarget);
        const desc = getPropertyDescriptor(shadowTarget, key);
        if (isUndefined(desc)) {
            return desc;
        }
        const { get } = desc;
        if (isFunction(get)) {
            return callWithErrorBoundaryProtection(this.env, () => {
                return apply(get, receiver, emptyArray);
            });
        }
        return desc.value;
    }
    set(shadowTarget: SecureShadowTarget, key: PropertyKey, value: SecureValue, receiver: SecureObject): boolean {
        this.initialize(shadowTarget);
        const shadowTargetDescriptor = getPropertyDescriptor(shadowTarget, key);
        if (!isUndefined(shadowTargetDescriptor)) {
            // descriptor exists in the shadowRoot or proto chain
            const { set, get, writable } = shadowTargetDescriptor;
            if (writable === false) {
                // TypeError: Cannot assign to read only property '${key}' of object
                return false;
            }
            if (isFunction(set)) {
                // a setter is available, just call it:
                callWithErrorBoundaryProtection(this.env, () => {
                    apply(set, receiver, [value]);
                });
                return true;
            }
            if (isFunction(get)) {
                // a getter without a setter should fail to set in strict mode
                // TypeError: Cannot set property ${key} of object which has only a getter
                return false;
            }
        } else if (!ReflectIsExtensible(shadowTarget)) {
            // non-extensible should throw in strict mode
            // TypeError: Cannot add property ${key}, object is not extensible
            return false;
        }
        // the descriptor is writable on the obj or proto chain, just assign it
        callWithErrorBoundaryProtection(this.env, () => {
            shadowTarget[key] = value;
        });
        return true;
    }
    deleteProperty(shadowTarget: SecureShadowTarget, key: PropertyKey): boolean {
        this.initialize(shadowTarget);
        return deleteProperty(shadowTarget, key);
    }
    apply(shadowTarget: SecureShadowTarget, thisArg: SecureValue, argArray: SecureValue[]): SecureValue {
        const { target, env } = this;
        this.initialize(shadowTarget);
        const rawThisArg = env.getRawValue(thisArg);
        const rawArgArray = env.getRawArray(argArray);
        const raw = callWithErrorBoundaryProtection(this.env, () => {
            return apply(target as RawFunction, rawThisArg, rawArgArray);
        });
        return env.getSecureValue(raw) as SecureValue;
    }
    construct(shadowTarget: SecureShadowTarget, argArray: SecureValue[], newTarget: SecureObject): SecureObject {
        const { target: RawCtor, env } = this;
        this.initialize(shadowTarget);
        if (newTarget === undefined) {
            throw TypeError();
        }
        const rawArgArray = env.getRawArray(argArray);
        const rawNewTarget = env.getRawValue(newTarget);
        const raw = callWithErrorBoundaryProtection(this.env, () => {
            return construct(RawCtor as RawConstructor, rawArgArray, rawNewTarget);
        });
        const sec = env.getSecureValue(raw);
        return sec as SecureObject;
    }
    has(shadowTarget: SecureShadowTarget, key: PropertyKey): boolean {
        this.initialize(shadowTarget);
        return key in shadowTarget;
    }
    ownKeys(shadowTarget: SecureShadowTarget): PropertyKey[] {
        this.initialize(shadowTarget);
        return ownKeys(shadowTarget);
    }
    isExtensible(shadowTarget: SecureShadowTarget): boolean {
        this.initialize(shadowTarget);
        // No DOM API is non-extensible, but in the sandbox, the author
        // might want to make them non-extensible
        return ReflectIsExtensible(shadowTarget);
    }
    getOwnPropertyDescriptor(shadowTarget: SecureShadowTarget, key: PropertyKey): PropertyDescriptor | undefined {
        this.initialize(shadowTarget);
        // TODO: this is leaking outer realm's object
        return ReflectGetOwnPropertyDescriptor(shadowTarget, key);
    }
    getPrototypeOf(shadowTarget: SecureShadowTarget): SecureValue {
        this.initialize(shadowTarget);
        // nothing to be done here since the shadowTarget must have the right proto chain
        return ReflectGetPrototypeOf(shadowTarget);
    }
    setPrototypeOf(shadowTarget: SecureShadowTarget, prototype: SecureValue): boolean {
        this.initialize(shadowTarget);
        // this operation can only affect the env object graph
        return ReflectSetPrototypeOf(shadowTarget, prototype);
    }
    preventExtensions(shadowTarget: SecureShadowTarget): boolean {
        this.initialize(shadowTarget);
        // this operation can only affect the env object graph
        return ReflectPreventExtensions(shadowTarget);
    }
    defineProperty(shadowTarget: SecureShadowTarget, key: PropertyKey, descriptor: PropertyDescriptor): boolean {
        this.initialize(shadowTarget);
        // this operation can only affect the env object graph
        return ReflectDefineProperty(shadowTarget, key, descriptor);
    }
}

ReflectSetPrototypeOf(SecureProxyHandler.prototype, null);
