import {
    isUndefined,
    ObjectCreate,
    ReflectGetPrototypeOf,
    isFrozen,
    isSealed,
    ReflectIsExtensible,
    getOwnPropertyDescriptors,
    ReflectGetOwnPropertyDescriptor,
    hasOwnProperty,
    isTrue,
    isFunction,
    ReflectDefineProperty,
} from "./shared";

export type RawValue = any;
export type RawArray = RawValue[];
export type RawFunction = (...args: RawValue[]) => RawValue;
export type RawObject = object;
export interface RawConstructor {
    new(...args: any[]): RawObject;
}
export type SecureProxyTarget = RawObject | RawFunction | RawConstructor;
export type ReverseProxyTarget = SecureObject | SecureFunction | SecureConstructor;
// TODO: how to doc the ProxyOf<>
export type SecureShadowTarget = SecureProxyTarget; // Proxy<SecureProxyTarget>;
export type ReverseShadowTarget = ReverseProxyTarget; // Proxy<ReverseProxyTarget>;

export type SecureValue = any;
export type SecureFunction = (...args: SecureValue[]) => SecureValue;
export type SecureArray = SecureValue[];
export type SecureObject = object;
export interface SecureConstructor {
    new(...args: any[]): SecureObject;
}

export interface TargetMeta {
    proto: null | SecureProxyTarget | ReverseProxyTarget;
    descriptors: PropertyDescriptorMap;
    isFrozen?: true;
    isSealed?: true;
    isExtensible?: true;
    isBroken?: true;
}

export function getTargetMeta(target: SecureProxyTarget | ReverseProxyTarget): TargetMeta {
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

export function installDescriptorIntoShadowTarget(shadowTarget: SecureProxyTarget | ReverseProxyTarget, key: PropertyKey, originalDescriptor: PropertyDescriptor) {
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

export function createShadowTarget(o: SecureProxyTarget): SecureShadowTarget
export function createShadowTarget(target: ReverseProxyTarget): ReverseShadowTarget {
    let shadowTarget;
    if (isFunction(target)) {
        shadowTarget = function () {};
        let nameDescriptor: PropertyDescriptor | undefined;
        try {
            // a revoked proxy will break the membrane when reading the function name
            nameDescriptor = ReflectGetOwnPropertyDescriptor(target, 'name');
        } catch (_ignored) {
            // intentionally swallowing the error because this method is just extracting the function
            // in a way that it should always succeed except for the cases in which the target is a proxy
            // that is either revoked or has some logic to prevent reading the name property descriptor.
            // If it is revoked, it will be handled by the getTargetMeta() at some point, else, we just
            // assume no name will be exposed, and continue.
            // TODO: is the ignore name logic good enough? or should we be more restrictive?
        }
        if (!isUndefined(nameDescriptor)) {
            ReflectDefineProperty(shadowTarget, 'name', nameDescriptor);
        }
    } else {
        // o is object
        shadowTarget = {};
    }
    return shadowTarget;
}
