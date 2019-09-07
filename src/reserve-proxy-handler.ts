import {
    isUndefined,
    ObjectDefineProperty,
    setPrototypeOf,
    getPrototypeOf,
    getOwnPropertyDescriptor,
    getOwnPropertyNames,
    getOwnPropertySymbols,
    getOwnPropertyDescriptors,
    freeze,
    getPropertyDescriptor,
} from './shared';
import { SecureDOMEnvironment, ReverseProxyTarget, ShadowTarget, RawValue, RawObject } from './realm';

function getReverseDescriptor(descriptor: PropertyDescriptor, env: SecureDOMEnvironment): PropertyDescriptor {
    const { value, get, set, writable } = descriptor;
    if (isUndefined(writable)) {
        // we are dealing with accessors
        if (!isUndefined(set)) {
            descriptor.set = env.getRawFunction(set);
        }
        if (!isUndefined(get)) {
            descriptor.get = env.getRawFunction(get);
        }
        return descriptor;
    } else {
        descriptor.value = env.getRawValue(value);
    }
    descriptor.configurable = false; // reverse descriptors are always non-configurable
    return descriptor;
}

function copyReverseOwnDescriptors(env: SecureDOMEnvironment, shadowTarget: ShadowTarget, target: ReverseProxyTarget) {
    // TODO: typescript definition for getOwnPropertyDescriptors is wrong, it should include symbols
    const descriptors = getOwnPropertyDescriptors(target);
    for (const key in descriptors) {
        let descriptor = descriptors[key];
        descriptor = getReverseDescriptor(descriptor, env);
        ObjectDefineProperty(shadowTarget, key, descriptor);
    }
}

const noop = () => undefined;

/**
 * identity preserved through this membrane:
 *  - symbols
 */
export class ReverseProxyHandler implements ProxyHandler<object> {
    // original target for the proxy
    private readonly target: ReverseProxyTarget;
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
        const secureProto = getPrototypeOf(target);
        setPrototypeOf(shadowTarget, env.getRawValue(secureProto));
        // defining own descriptors
        copyReverseOwnDescriptors(env, shadowTarget, target);
        // once the initialization is executed once... the rest is just noop 
        this.initialize = noop;
        // future optimization: hoping that proxies with frozen handlers can be faster
        freeze(this);
    }

    get(shadowTarget: ShadowTarget, key: PropertyKey): RawValue {
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
    set(shadowTarget: ShadowTarget, key: PropertyKey, value: RawValue): boolean {
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
    deleteProperty(shadowTarget: ShadowTarget, _key: PropertyKey): boolean {
        this.initialize(shadowTarget);
        return false; // reverse proxies are immutable
    }
    apply(shadowTarget: ShadowTarget, thisArg: RawValue, argArray: RawValue[]): RawValue {
        const { target, env } = this;
        this.initialize(shadowTarget);
        const secThisArg = env.getSecureValue(thisArg);
        const secArgArray = env.getSecureArray(argArray);
        // @ts-ignore caridy: TODO: lets figure what's going on here
        const o = target.apply(secThisArg, secArgArray);
        return env.getRawValue(o);
    }
    construct(shadowTarget: ShadowTarget, argArray: RawValue[], newTarget?: RawObject): RawObject {
        const { target: SecConstructor, env } = this;
        this.initialize(shadowTarget);
        const secArgArray = env.getSecureArray(argArray);
        // @ts-ignore caridy: TODO: lets figure what's going on here
        const sec = new SecConstructor(...secArgArray);
        if (newTarget === undefined) {
            throw TypeError();
        }
        env.linkSecureToRawValue(sec, newTarget);
        return newTarget as RawObject;
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
        return false; // reverse proxies are immutable
    }
    getOwnPropertyDescriptor(shadowTarget: ShadowTarget, key: PropertyKey): PropertyDescriptor | undefined {
        this.initialize(shadowTarget);
        return getOwnPropertyDescriptor(shadowTarget, key);
    }
    getPrototypeOf(shadowTarget: ShadowTarget): object {
        this.initialize(shadowTarget);
        // nothing to be done here since the shadowTarget must have the right proto chain
        return getPrototypeOf(shadowTarget);
    }
    setPrototypeOf(shadowTarget: ShadowTarget, _prototype: RawValue): boolean {
        this.initialize(shadowTarget);
        return false; // reverse proxies are immutable
    }
    preventExtensions(shadowTarget: ShadowTarget): boolean {
        this.initialize(shadowTarget);
        return false; // reverse proxies are immutable
    }
    defineProperty(shadowTarget: ShadowTarget, _key: PropertyKey, _descriptor: PropertyDescriptor): boolean {
        this.initialize(shadowTarget);
        return false; // reverse proxies are immutable
    }
}
