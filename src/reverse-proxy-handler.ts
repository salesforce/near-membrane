import {
    apply,
    assign,
    construct,
    isUndefined,
    defineProperty,
    setPrototypeOf,
    getPrototypeOf,
    getOwnPropertyDescriptor,
    getOwnPropertyDescriptors,
    freeze,
    isFunction,
    isTrue,
    hasOwnProperty,
    ObjectCreate,
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
    const reverseDescriptor = assign(ObjectCreate(null), descriptor);
    const { value, get, set } = reverseDescriptor;
    if ('writable' in reverseDescriptor) {
        // we are dealing with a value descriptor
        reverseDescriptor.value = isFunction(value) ?
            // we are dealing with a method (optimization)
            env.getRawFunction(value) : env.getRawValue(value);
    } else {
        // we are dealing with accessors
        if (isFunction(set)) {
            reverseDescriptor.set = env.getRawFunction(set);
        }
        if (isFunction(get)) {
            reverseDescriptor.get = env.getRawFunction(get);
        }
    }
    return reverseDescriptor;
}

function copyReverseOwnDescriptors(env: SecureEnvironment, shadowTarget: ReverseShadowTarget, target: ReverseProxyTarget) {
    // TODO: typescript definition for getOwnPropertyDescriptors is wrong, it should include symbols
    const descriptors = getOwnPropertyDescriptors(target);
    for (const key in descriptors) {
        // avoid poisoning by checking own properties from descriptors
        if (hasOwnProperty(descriptors, key)) {
            const originalDescriptor = getReverseDescriptor(descriptors[key], env);
            const shadowTargetDescriptor = getOwnPropertyDescriptor(shadowTarget, key);
            if (!isUndefined(shadowTargetDescriptor)) {
                if (hasOwnProperty(shadowTargetDescriptor, 'configurable') &&
                        isTrue(shadowTargetDescriptor.configurable)) {
                    defineProperty(shadowTarget, key, originalDescriptor);
                } else if (isTrue(shadowTargetDescriptor.writable)) {
                    // just in case
                    shadowTarget[key] = hasOwnProperty(originalDescriptor, 'value') ?
                        originalDescriptor.value : undefined;
                } else {
                    // ignoring... since it is non configurable and non-writable
                    // usually, arguments, callee, etc.
                }
            } else {
                defineProperty(shadowTarget, key, originalDescriptor);
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
        // reserve proxies are always frozen
        freeze(shadowTarget);
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
}

setPrototypeOf(ReverseProxyHandler.prototype, null);