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
    freeze,
    emptyArray,
    hasOwnProperty,
    seal,
} from './shared';
import {
    SecureEnvironment,
} from './environment';
import {
    SecureProxyTarget,
    SecureValue,
    SecureObject,
    RawConstructor,
    RawFunction,
    SecureShadowTarget,
} from './membrane';
import { TargetMeta, installDescriptorIntoShadowTarget } from './membrane';

export function getSecureDescriptor(descriptor: PropertyDescriptor, env: SecureEnvironment): PropertyDescriptor {
    const secureDescriptor = assign(ObjectCreate(null), descriptor);
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
        const d = ReflectGetOwnPropertyDescriptor(o, p);
        if (!isUndefined(d)) {
            ReflectSetPrototypeOf(d, null);
            return d;
        }
        o = ReflectGetPrototypeOf(o);
    } while (o !== null);
    return undefined;
}

function copySecureOwnDescriptors(env: SecureEnvironment, shadowTarget: SecureShadowTarget, descriptors: PropertyDescriptorMap) {
    for (const key in descriptors) {
        // avoid poisoning by checking own properties from descriptors
        if (hasOwnProperty(descriptors, key)) {
            const originalDescriptor = getSecureDescriptor(descriptors[key], env);
            installDescriptorIntoShadowTarget(shadowTarget, key, originalDescriptor);
        }
    }
}

function callWithErrorBoundaryProtection(env: SecureEnvironment, fn: () => SecureValue): SecureValue {
    let sec;
    try {
        sec = fn();
    } catch (e) {
        // This error occurred when a sandbox invokes a function from the outer realm.
        if (e instanceof Error) {
            let secError;
            try {
                secError = new (env.getSecureValue(e.constructor))(e.message);
            } catch (ignored) {
                // in case the constructor inference fails
                secError = new (env.getSecureValue(Error))(e.message)
            }
            // by throwing a new secure error, we eliminate the stack information from the outer realm
            throw secError;
        }
        throw e;
    }
    return sec;
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
    // metadata about the shape of the target
    private readonly meta: TargetMeta;

    constructor(env: SecureEnvironment, target: SecureProxyTarget, meta: TargetMeta) {
        this.target = target;
        this.meta = meta;
        this.env = env;
    }
    // initialization used to avoid the initialization cost
    // of an object graph, we want to do it when the
    // first interaction happens.
    private initialize(shadowTarget: SecureShadowTarget) {
        const { meta, env } = this;
        // once the initialization is executed once... the rest is just noop 
        this.initialize = noop;
        // adjusting the proto chain of the shadowTarget (recursively)
        const secProto =  env.getSecureValue(meta.proto);
        ReflectSetPrototypeOf(shadowTarget, secProto);
        // defining own descriptors
        copySecureOwnDescriptors(env, shadowTarget, meta.descriptors);
        // preserving the semantics of the object
        if (meta.isFrozen) {
            freeze(shadowTarget);
        } else if (meta.isSealed) {
            seal(shadowTarget);
        } else if (!meta.isExtensible) {
            ReflectPreventExtensions(shadowTarget);
        }
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
            // calling the getter with the secure receiver because the getter expects a secure value
            // it also returns a secure value
            return apply(get, receiver, emptyArray);
        }
        return desc.value;
    }
    set(shadowTarget: SecureShadowTarget, key: PropertyKey, value: SecureValue, receiver: SecureObject): boolean {
        this.initialize(shadowTarget);
        const shadowTargetDescriptor = getPropertyDescriptor(shadowTarget, key);
        if (!isUndefined(shadowTargetDescriptor)) {
            // descriptor exists in the shadowTarget or proto chain
            const { set, get, writable } = shadowTargetDescriptor;
            if (writable === false) {
                // TypeError: Cannot assign to read only property '${key}' of object
                return false;
            }
            if (isFunction(set)) {
                // a setter is available, just call it with the secure value because
                // the setter expects a secure value
                apply(set, receiver, [value]);
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
        shadowTarget[key] = value;
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
        return callWithErrorBoundaryProtection(env, () => {
            const raw = apply(target as RawFunction, rawThisArg, rawArgArray);
            return env.getSecureValue(raw);
        });
    }
    construct(shadowTarget: SecureShadowTarget, argArray: SecureValue[], newTarget: SecureObject): SecureObject {
        const { target: RawCtor, env } = this;
        this.initialize(shadowTarget);
        if (newTarget === undefined) {
            throw TypeError();
        }
        const rawArgArray = env.getRawArray(argArray);
        const rawNewTarget = env.getRawValue(newTarget);
        return callWithErrorBoundaryProtection(env, () => {
            const raw = construct(RawCtor as RawConstructor, rawArgArray, rawNewTarget);
            return env.getSecureValue(raw);
        });
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
