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
    isObject,
    isTrue,
    isNull,
    getOwnPropertyDescriptors,
    freeze,
    getPropertyDescriptor,
} from './shared';
import { SecureDOMEnvironment, SecureProxyTarget, ShadowTarget, SecureValue, SecureObject } from './realm';

function getSecureDescriptor(descriptor: PropertyDescriptor, env: SecureDOMEnvironment): PropertyDescriptor {
    const { value, get, set, writable } = descriptor;
    if (isUndefined(writable)) {
        // we are dealing with accessors
        // Note: HTMLDocument.location is the only offender that has a
        // non-configurable descriptor with accessors, the rest are configurable.
        if (!isUndefined(set)) {
            // TODO: do we really need to wrap this one?
            descriptor.set = env.getSecureFunction(set);
        }
        if (!isUndefined(get)) {
            descriptor.get = env.getSecureFunction(get);
        }
    } else if (isTrue(writable)) {
        if (isFunction(value)) {
            // we are dealing with a method
            descriptor.value = env.getSecureFunction(value);
        } else {
            // TODO: validate this assertions
            if (!isNull(null) && isObject(value)) {
                throw new Error(`DOM APIs are never exposing writable objects in descriptors`);
            }
            // letting the descriptor intact since it is just exposing a primitive value
        }
    } else {
        // when descriptors are non-writable, its value must be a primitive value
        // for DOM APIs
        if ((!isNull(null) && isObject(value)) || isFunction(value)) {
            throw new Error(`DOM APIs are never non-writable`);
        }
        // letting the descriptor intact since it is just exposing a primitive value
    }
    return descriptor;
}

function copySecureOwnDescriptors(env: SecureDOMEnvironment, shadowTarget: ShadowTarget, target: SecureProxyTarget) {
    // TODO: typescript definition for getOwnPropertyDescriptors is wrong, it should include symbols
    const descriptors = getOwnPropertyDescriptors(target);
    for (const key in descriptors) {
        let descriptor = descriptors[key];
        try {
            descriptor = getSecureDescriptor(descriptor, env);
        } catch (e) {
            console.error(`Invalid descriptor in ${target}.${key}: ${e}`);
            console.error(descriptors[key]);
            // throw new Error(`Invalid descriptor in ${target}.${key}: ${e}`);
        }
        ObjectDefineProperty(shadowTarget, key, descriptor);
    }
}

const noop = () => undefined;

/**
 * identity preserved through this membrane:
 *  - symbols
 */
export class SecureProxyHandler implements ProxyHandler<object> {
    // original target for the proxy
    private readonly target: SecureProxyTarget;
    // environment object that controls the realm
    private readonly env: SecureDOMEnvironment;

    constructor(env: SecureDOMEnvironment, target: object) {
        this.target = target;
        this.env = env;
    }
    // initialization used to avoid the initialization cost
    // of an object graph, we want to do it when the
    // first interaction happens.
    private initialize(shadowTarget: ShadowTarget) {
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

    get(shadowTarget: ShadowTarget, key: PropertyKey): SecureValue {
        this.initialize(shadowTarget);
        const desc = getPropertyDescriptor(shadowTarget, key);
        if (isUndefined(desc)) {
            return desc;
        }
        const { get } = desc;
        if (!isUndefined(get)) {
            const sr = this.env.stm.get(shadowTarget);
            if (isUndefined(sr)) {
                throw new Error(`Internal Error: a shadow target must always have secure record associated`);
            }
            return get.call(sr.sec);
        }
        return desc.value;
    }
    set(shadowTarget: ShadowTarget, key: PropertyKey, value: SecureValue): boolean {
        this.initialize(shadowTarget);
        const desc = getPropertyDescriptor(shadowTarget, key);
        if (isUndefined(desc)) {
            shadowTarget[key] = value;
        } else {
            const { set } = desc;
            if (!isUndefined(set)) {
                const sr = this.env.stm.get(shadowTarget);
                if (isUndefined(sr)) {
                    throw new Error(`Internal Error: a shadow target must always have secure record associated`);
                }
                set.call(sr.sec, value);
            }
        }
        return true;
    }
    deleteProperty(shadowTarget: ShadowTarget, key: PropertyKey): boolean {
        this.initialize(shadowTarget);
        delete shadowTarget[key];
        return true;
    }
    apply(shadowTarget: ShadowTarget, thisArg: SecureValue, argArray: SecureValue[]) {
        const { target, env } = this;
        this.initialize(shadowTarget);
        const rawThisArg = env.getRawValue(thisArg);
        const rawArgArray = env.getRawArray(argArray);
        // @ts-ignore caridy: TODO: lets figure what's going on here
        const o = target.apply(rawThisArg, rawArgArray);
        return env.getSecureValue(o);
    }
    construct(shadowTarget: ShadowTarget, argArray: SecureValue[], newTarget?: SecureObject): SecureObject {
        const { target: RawConstructor, env } = this;
        this.initialize(shadowTarget);
        const rawArgArray = env.getRawArray(argArray);
        // @ts-ignore caridy: TODO: lets figure what's going on here
        const o = new RawConstructor(...rawArgArray);
        if (newTarget === undefined) {
            throw TypeError();
        }
        env.linkSecureToRawValue(newTarget, o);
        return newTarget;
    }
    has(shadowTarget: ShadowTarget, key: PropertyKey): boolean {
        this.initialize(shadowTarget);
        return key in shadowTarget;
    }
    ownKeys(shadowTarget: ShadowTarget): (string | symbol)[] {
        this.initialize(shadowTarget);
        return [
            ...getOwnPropertyNames(shadowTarget),
            ...getOwnPropertySymbols(shadowTarget),
        ];
    }
    isExtensible(shadowTarget: ShadowTarget): boolean {
        this.initialize(shadowTarget);
        // No DOM API is non-extensible, but in the sandbox, the author
        // might want to make them non-extensible
        return isExtensible(shadowTarget);
    }
    getOwnPropertyDescriptor(shadowTarget: ShadowTarget, key: PropertyKey): PropertyDescriptor | undefined {
        this.initialize(shadowTarget);
        return getOwnPropertyDescriptor(shadowTarget, key);
    }
    getPrototypeOf(shadowTarget: ShadowTarget): SecureValue {
        this.initialize(shadowTarget);
        // nothing to be done here since the shadowTarget must have the right proto chain
        return getPrototypeOf(shadowTarget);
    }
    setPrototypeOf(shadowTarget: ShadowTarget, prototype: SecureValue): boolean {
        this.initialize(shadowTarget);
        // this operation can only affect the env object graph
        setPrototypeOf(shadowTarget, prototype);
        return true;
    }
    preventExtensions(shadowTarget: ShadowTarget): boolean {
        // this operation can only affect the env object graph
        this.initialize(shadowTarget);
        preventExtensions(shadowTarget);
        return true;
    }
    defineProperty(shadowTarget: ShadowTarget, key: PropertyKey, descriptor: PropertyDescriptor): boolean {
        this.initialize(shadowTarget);
        // this operation can only affect the env object graph
        ObjectDefineProperty(shadowTarget, key, descriptor);
        return true;
    }
}
