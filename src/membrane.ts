import {
    ObjectCreate,
    ReflectGetPrototypeOf,
    isFrozen,
    isSealed,
    ReflectIsExtensible,
    getOwnPropertyDescriptors,
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

export type SecureProxy = SecureObject | SecureFunction;
export type ReverseProxy = RawObject | RawFunction;

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
