import {
    isUndefined,
    ObjectDefineProperty,
    setPrototypeOf,
    getPrototypeOf,
    isExtensible,
    getOwnPropertyDescriptor,
    getOwnPropertyNames,
    getOwnPropertySymbols,
    preventExtensions,
    isFunction,
    getOwnPropertyDescriptors,
    freeze,
    isTrue,
} from './shared';
import {
    SecureEnvironment,
    SecureProxyTarget,
    SecureValue,
    SecureObject,
    RawConstructor,
    RawFunction,
    SecureShadowTarget,
} from './environment';

export function getSecureDescriptor(descriptor: PropertyDescriptor, env: SecureEnvironment): PropertyDescriptor {
    const { value, get, set, writable } = descriptor;
    if (isUndefined(writable)) {
        // we are dealing with accessors
        if (!isUndefined(set)) {
            descriptor.set = env.getSecureFunction(set);
        }
        if (!isUndefined(get)) {
            descriptor.get = env.getSecureFunction(get);
        }
    } else {
        descriptor.value = isFunction(value) ?
            // we are dealing with a method (optimization)
            env.getSecureFunction(value) : env.getSecureValue(value);
    }
    return descriptor;
}

// equivalent to Object.getOwnPropertyDescriptor, but looks into the whole proto chain
function getPropertyDescriptor(o: any, p: PropertyKey): PropertyDescriptor | undefined {
    do {
        const d = getOwnPropertyDescriptor(o, p);
        if (!isUndefined(d)) {
            return d;
        }
        o = getPrototypeOf(o);
    } while (o !== null);
    return undefined;
}

function copySecureOwnDescriptors(env: SecureEnvironment, shadowTarget: SecureShadowTarget, target: SecureProxyTarget) {
    // TODO: typescript definition for getOwnPropertyDescriptors is wrong, it should include symbols
    const descriptors = getOwnPropertyDescriptors(target);
    for (const key in descriptors) {
        let originalDescriptor = descriptors[key];
        originalDescriptor = getSecureDescriptor(originalDescriptor, env);
        const shadowTargetDescriptor = getOwnPropertyDescriptor(shadowTarget, key);
        if (!isUndefined(shadowTargetDescriptor)) {
            if (isTrue(shadowTargetDescriptor.configurable)) {
                ObjectDefineProperty(shadowTarget, key, originalDescriptor);
            } else if (isTrue(shadowTargetDescriptor.writable)) {
                // just in case
                shadowTarget[key] = originalDescriptor.value;
            } else {
                // ignoring... since it is non configurable and non-writable
                // usually, arguments, callee, etc.
            }
        } else {
            ObjectDefineProperty(shadowTarget, key, originalDescriptor);
        }
    }
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
        const rawProto = getPrototypeOf(target);
        setPrototypeOf(shadowTarget, env.getSecureValue(rawProto));
        // defining own descriptors
        copySecureOwnDescriptors(env, shadowTarget, target);
        // once the initialization is executed once... the rest is just noop 
        this.initialize = noop;
        // future optimization: hoping that proxies with frozen handlers can be faster
        freeze(this);
    }

    get(shadowTarget: SecureShadowTarget, key: PropertyKey): SecureValue {
        this.initialize(shadowTarget);
        const desc = getPropertyDescriptor(shadowTarget, key);
        if (isUndefined(desc)) {
            return desc;
        }
        const { get } = desc;
        if (!isUndefined(get)) {
            // this.target is already in registered in the map, which means it
            // will always return a valid secure object without having to create it.
            const sec = this.env.getSecureValue(this.target);
            return Reflect.apply(get, sec, []);
        }
        return desc.value;
    }
    set(shadowTarget: SecureShadowTarget, key: PropertyKey, value: SecureValue): boolean {
        this.initialize(shadowTarget);
        const desc = getPropertyDescriptor(shadowTarget, key);
        if (isUndefined(desc)) {
            if (isExtensible(shadowTarget)) {
                // it should be a descriptor installed on the current shadowTarget
                ObjectDefineProperty(shadowTarget, key, {
                    value,
                    configurable: true,
                    enumerable: true,
                    writable: true,
                });
            } else {
                // non-extensible should throw in strict mode
                // TypeError: Cannot add property ${key}, object is not extensible
                return false;
            }
        } else {
            // descriptor exists in the shadowRoot or proto chain
            const { set, get, writable } = desc;
            if (writable === false) {
                // TypeError: Cannot assign to read only property '${key}' of object
                return false;
            } else if (!isUndefined(set)) {
                // a setter is available, just call it:
                // this.target is already in registered in the map, which means it
                // will always return a valid secure object without having to create it.
                const sec = this.env.getSecureValue(this.target);
                Reflect.apply(set, sec, [value]);
            } else if (!isUndefined(get)) {
                // a getter without a setter should fail to set in strict mode
                // TypeError: Cannot set property ${key} of object which has only a getter
                return false;
            } else {
                // the descriptor is writable, just assign it
                shadowTarget[key] = value;
            }
        }
        return true;
    }
    deleteProperty(shadowTarget: SecureShadowTarget, key: PropertyKey): boolean {
        this.initialize(shadowTarget);
        delete shadowTarget[key];
        return true;
    }
    apply(shadowTarget: SecureShadowTarget, thisArg: SecureValue, argArray: SecureValue[]): SecureValue {
        const { target, env } = this;
        this.initialize(shadowTarget);
        const rawThisArg = env.getRawValue(thisArg);
        const rawArgArray = env.getRawArray(argArray);
        const raw = Reflect.apply(target as RawFunction, rawThisArg, rawArgArray);
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
        const raw = Reflect.construct(RawCtor as RawConstructor, rawArgArray, rawNewTarget);
        const sec = env.getSecureValue(raw);
        return sec as SecureObject;
    }
    has(shadowTarget: SecureShadowTarget, key: PropertyKey): boolean {
        this.initialize(shadowTarget);
        return key in shadowTarget;
    }
    ownKeys(shadowTarget: SecureShadowTarget): (string | symbol)[] {
        this.initialize(shadowTarget);
        return [
            ...getOwnPropertyNames(shadowTarget),
            ...getOwnPropertySymbols(shadowTarget),
        ];
    }
    isExtensible(shadowTarget: SecureShadowTarget): boolean {
        this.initialize(shadowTarget);
        // No DOM API is non-extensible, but in the sandbox, the author
        // might want to make them non-extensible
        return isExtensible(shadowTarget);
    }
    getOwnPropertyDescriptor(shadowTarget: SecureShadowTarget, key: PropertyKey): PropertyDescriptor | undefined {
        this.initialize(shadowTarget);
        return getOwnPropertyDescriptor(shadowTarget, key);
    }
    getPrototypeOf(shadowTarget: SecureShadowTarget): SecureValue {
        this.initialize(shadowTarget);
        // nothing to be done here since the shadowTarget must have the right proto chain
        return getPrototypeOf(shadowTarget);
    }
    setPrototypeOf(shadowTarget: SecureShadowTarget, prototype: SecureValue): boolean {
        this.initialize(shadowTarget);
        // this operation can only affect the env object graph
        setPrototypeOf(shadowTarget, prototype);
        return true;
    }
    preventExtensions(shadowTarget: SecureShadowTarget): boolean {
        // this operation can only affect the env object graph
        this.initialize(shadowTarget);
        preventExtensions(shadowTarget);
        return true;
    }
    defineProperty(shadowTarget: SecureShadowTarget, key: PropertyKey, descriptor: PropertyDescriptor): boolean {
        this.initialize(shadowTarget);
        // this operation can only affect the env object graph
        ObjectDefineProperty(shadowTarget, key, descriptor);
        return true;
    }
}
