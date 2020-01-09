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
    ErrorCreate,
    WeakMapGet,
    ReflectIsExtensible,
    isSealed,
    isFrozen,
    getOwnPropertyDescriptors,
    ReflectGetPrototypeOf,
    map,
    isNullish,
    unconstruct,
} from './shared';
import {
    ReverseProxyTarget,
    RawValue,
    RawObject,
    SecureConstructor,
    SecureFunction,
    ReverseShadowTarget,
    SecureProxyTarget,
    ReverseProxy,
    SecureRecord,
    RawFunction,
    SecureArray,
    RawArray,
    SecureValue,
    EnvironmentMaps,
    SecureObject,
    TargetMeta,
} from './types';

function renameFunction(provider: (...args: any[]) => any, receiver: (...args: any[]) => any) {
    let nameDescriptor: PropertyDescriptor | undefined;
    try {
        // a revoked proxy will break the membrane when reading the function name
        nameDescriptor = ReflectGetOwnPropertyDescriptor(provider, 'name');
    } catch (_ignored) {
        // intentionally swallowing the error because this method is just extracting the function
        // in a way that it should always succeed except for the cases in which the provider is a proxy
        // that is either revoked or has some logic to prevent reading the name property descriptor.
    }
    if (!isUndefined(nameDescriptor)) {
        ReflectDefineProperty(receiver, 'name', nameDescriptor);
    }
}

// it means it does have identity and should be proxified.
function isProxyTarget(o: RawValue): o is (SecureFunction | SecureConstructor | SecureObject) {
    // hire-wired for the common case
    if (isNullish(o)) {
        return false;
    }
    const t = typeof o;
    return t === 'object' || t === 'function';
}

const ProxyRevocable = Proxy.revocable;
const ProxyCreate = unconstruct(Proxy);
const { isArray: isArrayOrNotOrThrowForRevoked } = Array;

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

function getTargetMeta(target: SecureProxyTarget | ReverseProxyTarget): TargetMeta {
    const meta: TargetMeta = ObjectCreate(null);
    try {
        // a revoked proxy will break the membrane when reading the meta
        meta.proto = ReflectGetPrototypeOf(target);
        meta.descriptors = getOwnPropertyDescriptors(target);
        if (isFrozen(target)) {
            meta.isFrozen = meta.isSealed = meta.isExtensible = true;
        } else if (isSealed(target)) {
            meta.isSealed = meta.isExtensible = true;
        } else if (ReflectIsExtensible(target)) {
            meta.isExtensible = true;
        }
    } catch (_ignored) {
        // intentionally swallowing the error because this method is just extracting the metadata
        // in a way that it should always succeed except for the cases in which the target is a proxy
        // that is either revoked or has some logic that is incompatible with the membrane, in which
        // case we will just create the proxy for the membrane but revoke it right after to prevent
        // any leakage.
        meta.proto = null;
        meta.descriptors = {};
        meta.isBroken = true;
    }
    return meta;
}

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

export function reverseProxyFactory(env: EnvironmentMaps) {

    function getReverseDescriptor(descriptor: PropertyDescriptor): PropertyDescriptor {
        const reverseDescriptor = assign(ObjectCreate(null), descriptor);
        const { value, get, set } = reverseDescriptor;
        if ('writable' in reverseDescriptor) {
            // we are dealing with a value descriptor
            reverseDescriptor.value = isFunction(value) ?
                // we are dealing with a method (optimization)
                getRawFunction(value) : getRawValue(value);
        } else {
            // we are dealing with accessors
            if (isFunction(set)) {
                reverseDescriptor.set = getRawFunction(set);
            }
            if (isFunction(get)) {
                reverseDescriptor.get = getRawFunction(get);
            }
        }
        return reverseDescriptor;
    }

    function copyReverseOwnDescriptors(shadowTarget: ReverseShadowTarget, descriptors: PropertyDescriptorMap) {
        for (const key in descriptors) {
            // avoid poisoning by checking own properties from descriptors
            if (hasOwnProperty(descriptors, key)) {
                const originalDescriptor = getReverseDescriptor(descriptors[key]);
                installDescriptorIntoShadowTarget(shadowTarget, key, originalDescriptor);
            }
        }
    }

    class ReverseProxyHandler implements ProxyHandler<ReverseProxyTarget> {
        // original target for the proxy
        private readonly target: ReverseProxyTarget;
        // metadata about the shape of the target
        private readonly meta: TargetMeta;

        constructor(target: ReverseProxyTarget, meta: TargetMeta) {
            this.target = target;
            this.meta = meta;
        }
        initialize(shadowTarget: ReverseShadowTarget) {
            const { meta } = this;
            // adjusting the proto chain of the shadowTarget (recursively)
            const rawProto = env.getRawValue(meta.proto);
            ReflectSetPrototypeOf(shadowTarget, rawProto);
            // defining own descriptors
            copyReverseOwnDescriptors(shadowTarget, meta.descriptors);
            // reserve proxies are always frozen
            freeze(shadowTarget);
            // future optimization: hoping that proxies with frozen handlers can be faster
            freeze(this);
        }
        apply(shadowTarget: ReverseShadowTarget, thisArg: RawValue, argArray: RawValue[]): RawValue {
            const { target } = this;
            const secThisArg = env.getSecureValue(thisArg);
            const secArgArray = env.getSecureValue(argArray);
            let sec;
            try {
                sec = apply(target as SecureFunction, secThisArg, secArgArray);
            } catch (e) {
                // This error occurred when the outer realm attempts to call a
                // function from the sandbox. By throwing a new raw error, we eliminates the stack
                // information from the sandbox as a consequence.
                let rawError;
                const { message, constructor } = e;
                try {
                    // the error constructor must be a secure error since it occur when calling
                    // a function from the sandbox.
                    const sr: SecureRecord | undefined = WeakMapGet(env.som, constructor);
                    // the raw constructor must be registered (done during construction of env)
                    // otherwise we need to fallback to a regular error.
                    rawError = construct(sr!.raw as RawFunction, [message]);
                } catch (ignored) {
                    // in case the constructor inference fails
                    rawError = ErrorCreate(message);
                }
                throw rawError;
            }
            return env.getRawValue(sec);
        }
        construct(shadowTarget: ReverseShadowTarget, argArray: RawValue[], newTarget: RawObject): RawObject {
            const { target: SecCtor } = this;
            if (newTarget === undefined) {
                throw TypeError();
            }
            const secArgArray = env.getSecureValue(argArray);
            // const secNewTarget = env.getSecureValue(newTarget);
            let sec;
            try {
                sec = construct(SecCtor as SecureConstructor, secArgArray);
            } catch (e) {
                // This error occurred when the outer realm attempts to new a
                // constructor from the sandbox. By throwing a new raw error, we eliminates the stack
                // information from the sandbox as a consequence.
                let rawError;
                const { message, constructor } = e;
                try {
                    // the error constructor must be a secure error since it occur when calling
                    // a function from the sandbox.
                    const sr: SecureRecord | undefined = WeakMapGet(env.som, constructor);
                    // the raw constructor must be registered (done during construction of env)
                    // otherwise we need to fallback to a regular error.
                    rawError = construct(sr!.raw as RawFunction, [message]);
                } catch (ignored) {
                    // in case the constructor inference fails
                    rawError = ErrorCreate(message);
                }
                throw rawError;
            }
            return env.getRawValue(sec);
        }
    }

    ReflectSetPrototypeOf(ReverseProxyHandler.prototype, null);

    function getRawValue(sec: SecureValue): RawValue {
        let isSecArray = false;
        try {
            isSecArray = isArrayOrNotOrThrowForRevoked(sec);
        } catch (ignored) {
            return getRevokedReverseProxy(sec);
        }
        if (isSecArray) {
            return getRawArray(sec);
        } else if (isProxyTarget(sec)) {
            const sr: SecureRecord | undefined = WeakMapGet(env.som, sec);
            if (isUndefined(sr)) {
                return createReverseProxy(sec);
            }
            return sr.raw;
        }
        return sec as RawValue;
    }

    function getRawFunction(fn: SecureFunction): RawFunction {
        const sr: SecureRecord | undefined = WeakMapGet(env.som, fn);
        if (isUndefined(sr)) {
            return createReverseProxy(fn) as RawFunction;
        }
        return sr.raw as SecureFunction;
    }

    function getRawArray(a: SecureArray): RawArray {
        // identity of the new array correspond to the outer realm
        return map(a, (sec: SecureValue) => getRawValue(sec));
    }

    function getRevokedReverseProxy(sec: ReverseProxyTarget): ReverseProxy {
        const shadowTarget = createReverseShadowTarget(sec);
        const { proxy, revoke } = ProxyRevocable(shadowTarget, {});
        env.createSecureRecord(sec, proxy);
        revoke();
        return proxy;
    }

    function createReverseProxy(sec: ReverseProxyTarget): ReverseProxy {
        const meta = getTargetMeta(sec);
        if (meta.isBroken) {
            return getRevokedReverseProxy(sec);
        }
        const shadowTarget = createReverseShadowTarget(sec);
        const proxyHandler = new ReverseProxyHandler(sec, meta);
        const proxy = ProxyCreate(shadowTarget, proxyHandler);
        env.createSecureRecord(sec, proxy);
        // eager initialization of reverse proxies
        proxyHandler.initialize(shadowTarget);
        return proxy;
    }

    return getRawValue;

}
