import {
    apply,
    assign,
    construct,
    ReflectSetPrototypeOf,
    freeze,
    isFunction,
    hasOwnProperty,
    ObjectCreate,
    isUndefined,
    ReflectGetOwnPropertyDescriptor,
    isTrue,
    ReflectDefineProperty,
    renameFunction,
    ProxyRevocable,
} from './shared';
import {
    SecureEnvironment,
} from './environment';
import {
    ReverseProxyTarget,
    RawValue,
    RawObject,
    SecureConstructor,
    SecureFunction,
    ReverseShadowTarget,
    SecureProxyTarget,
} from './membrane';
import { TargetMeta } from './membrane';

export type ReverseRevocableInitializableProxyFactory = <ReverseProxy>(raw: ReverseProxyTarget, meta: TargetMeta) => {
    proxy: ReverseProxy;
    revoke: () => void;
    initialize: () => void;
};

function installDescriptorIntoShadowTarget(shadowTarget: SecureProxyTarget | ReverseProxyTarget, key: PropertyKey, originalDescriptor: PropertyDescriptor) {
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

function copyReverseOwnDescriptors(env: SecureEnvironment, shadowTarget: ReverseShadowTarget, descriptors: PropertyDescriptorMap) {
    for (const key in descriptors) {
        // avoid poisoning by checking own properties from descriptors
        if (hasOwnProperty(descriptors, key)) {
            const originalDescriptor = getReverseDescriptor(descriptors[key], env);
            installDescriptorIntoShadowTarget(shadowTarget, key, originalDescriptor);
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
    // metadata about the shape of the target
    private readonly meta: TargetMeta;

    constructor(env: SecureEnvironment, target: ReverseProxyTarget, meta: TargetMeta) {
        this.target = target;
        this.meta = meta;
        this.env = env;
    }
    initialize(shadowTarget: ReverseShadowTarget) {
        const { meta, env } = this;
        // adjusting the proto chain of the shadowTarget (recursively)
        const rawProto = env.getRawValue(meta.proto);
        ReflectSetPrototypeOf(shadowTarget, rawProto);
        // defining own descriptors
        copyReverseOwnDescriptors(env, shadowTarget, meta.descriptors);
        // reserve proxies are always frozen
        freeze(shadowTarget);
        // future optimization: hoping that proxies with frozen handlers can be faster
        freeze(this);
    }
    apply(shadowTarget: ReverseShadowTarget, thisArg: RawValue, argArray: RawValue[]): RawValue {
        const { target, env } = this;
        try {
            const secThisArg = env.getSecureValue(thisArg);
            const secArgArray = env.getSecureArray(argArray);
            const sec = apply(target as SecureFunction, secThisArg, secArgArray);
            return env.getRawValue(sec);
        } catch (e) {
            // by throwing a new raw error, we avoid leaking error instances from sandbox
            throw e;
        }
    }
    construct(shadowTarget: ReverseShadowTarget, argArray: RawValue[], newTarget: RawObject): RawObject {
        const { target: SecCtor, env } = this;
        if (newTarget === undefined) {
            throw TypeError();
        }
        try {
            const secArgArray = env.getSecureArray(argArray);
            // const secNewTarget = env.getSecureValue(newTarget);
            const sec = construct(SecCtor as SecureConstructor, secArgArray);
            return env.getRawValue(sec);
        } catch (e) {
            // by throwing a new raw error, we avoid leaking error instances from sandbox
            throw e;
        }
    }
}

ReflectSetPrototypeOf(ReverseProxyHandler.prototype, null);

function createReverseShadowTarget(target: ReverseProxyTarget): ReverseShadowTarget {
    let shadowTarget;
    if (isFunction(target)) {
        // this is never invoked just needed to anchor the realm
        shadowTarget = function () {};
        renameFunction(target as (...args: any[]) => any, shadowTarget as (...args: any[]) => any);
    } else {
        // o is object
        shadowTarget = {};
    }
    return shadowTarget;
}

export function reverseProxyFactory(env: SecureEnvironment) {
    return function createReverseProxy(sec: ReverseProxyTarget, meta: TargetMeta) {
        const shadowTarget = createReverseShadowTarget(sec);
        const proxyHandler = new ReverseProxyHandler(env, sec, meta);
        const { proxy, revoke } = ProxyRevocable(shadowTarget, proxyHandler);
        return {
            proxy,
            revoke,
            initialize: () => proxyHandler.initialize(shadowTarget),
        };
    } as ReverseRevocableInitializableProxyFactory;
}
