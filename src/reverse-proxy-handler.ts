import {
    apply,
    construct,
    isUndefined,
    ObjectDefineProperty,
    setPrototypeOf,
    getPrototypeOf,
    getOwnPropertyDescriptor,
    getOwnPropertyNames,
    getOwnPropertySymbols,
    getOwnPropertyDescriptors,
    freeze,
    isFunction,
    isTrue,
    hasOwnProperty,
} from './shared';
import {
    SecureEnvironment,
    ReverseProxyTarget,
    RawValue,
    RawObject,
    SecureConstructor,
    SecureFunction,
    ReverseShadowTarget,
} from './environment';

function getReverseDescriptor(descriptor: PropertyDescriptor, env: SecureEnvironment): PropertyDescriptor {
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
        // we are dealing with a value descriptor
        descriptor.value = isFunction(value) ?
            // we are dealing with a method (optimization)
            env.getRawFunction(value) : env.getRawValue(value);
    }
    return descriptor;
}

function copyReverseOwnDescriptors(env: SecureEnvironment, shadowTarget: ReverseShadowTarget, target: ReverseProxyTarget) {
    // TODO: typescript definition for getOwnPropertyDescriptors is wrong, it should include symbols
    const descriptors = getOwnPropertyDescriptors(target);
    for (const key in descriptors) {
        // avoid poisoning by checking own properties from descriptors
        if (hasOwnProperty(descriptors, key)) {
            let originalDescriptor = descriptors[key];
            originalDescriptor = getReverseDescriptor(originalDescriptor, env);
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
}

/**
 * identity preserved through this membrane:
 *  - symbols
 */
export class ReverseProxyHandler implements ProxyHandler<ReverseProxyTarget> {
    // original target for the proxy
    private readonly target: ReverseProxyTarget;
    // environment object that controls the realm
    private readonly env: SecureEnvironment;

    constructor(env: SecureEnvironment, target: ReverseProxyTarget) {
        this.target = target;
        this.env = env;
    }
    initialize(shadowTarget: ReverseShadowTarget) {
        const { target, env } = this;
        // adjusting the proto chain of the shadowTarget (recursively)
        const secureProto = getPrototypeOf(target);
        setPrototypeOf(shadowTarget, env.getRawValue(secureProto));
        // defining own descriptors
        copyReverseOwnDescriptors(env, shadowTarget, target);
        // future optimization: hoping that proxies with frozen handlers can be faster
        freeze(this);
    }
    apply(shadowTarget: ReverseShadowTarget, thisArg: RawValue, argArray: RawValue[]): RawValue {
        const { target, env } = this;
        const secThisArg = env.getSecureValue(thisArg);
        const secArgArray = env.getSecureArray(argArray);
        const sec = apply(target as SecureFunction, secThisArg, secArgArray);
        return env.getRawValue(sec) as RawValue;
    }
    construct(shadowTarget: ReverseShadowTarget, argArray: RawValue[], newTarget: RawObject): RawObject {
        const { target: SecCtor, env } = this;
        if (newTarget === undefined) {
            throw TypeError();
        }
        const secArgArray = env.getSecureArray(argArray);
        // const secNewTarget = env.getSecureValue(newTarget);
        const sec = construct(SecCtor as SecureConstructor, secArgArray);
        const raw = env.getRawValue(sec);
        return raw as RawObject;
    }
    has(shadowTarget: ReverseShadowTarget, key: PropertyKey): boolean {
        return key in shadowTarget;
    }
    ownKeys(shadowTarget: ReverseShadowTarget): (string | symbol)[] {
        // TODO: avoid triggering the iterator protocol
        return [
            ...getOwnPropertyNames(shadowTarget),
            ...getOwnPropertySymbols(shadowTarget),
        ];
    }
    getOwnPropertyDescriptor(shadowTarget: ReverseShadowTarget, key: PropertyKey): PropertyDescriptor | undefined {
        return getOwnPropertyDescriptor(shadowTarget, key);
    }
    getPrototypeOf(shadowTarget: ReverseShadowTarget): object {
        // nothing to be done here since the shadowTarget must have the right proto chain
        return getPrototypeOf(shadowTarget);
    }
    deleteProperty(shadowTarget: ReverseShadowTarget, _key: PropertyKey): boolean {
        return false; // reverse proxies are immutable
    }
    isExtensible(shadowTarget: ReverseShadowTarget): boolean {
        return false; // reverse proxies are immutable
    }
    setPrototypeOf(shadowTarget: ReverseShadowTarget, _prototype: RawValue): boolean {
        return false; // reverse proxies are immutable
    }
    preventExtensions(shadowTarget: ReverseShadowTarget): boolean {
        return false; // reverse proxies are immutable
    }
    defineProperty(shadowTarget: ReverseShadowTarget, _key: PropertyKey, _descriptor: PropertyDescriptor): boolean {
        return false; // reverse proxies are immutable
    }
}
