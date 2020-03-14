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

export type DistortionMap = WeakMap<SecureProxyTarget, SecureProxyTarget>;

export interface MembraneBroker {
    // secure ref map to reverse proxy or raw ref
    som: WeakMap<SecureFunction | SecureObject, SecureProxyTarget | ReverseProxy>;
    // raw ref map to secure proxy or secure ref
    rom: WeakMap<RawFunction | RawObject, SecureProxy | ReverseProxyTarget>;
    // raw object distortion map
    distortionMap: DistortionMap;

    getRawValue(sec: SecureValue): RawValue;
    getSecureValue(raw: RawValue): SecureValue;
    getRawRef(sec: SecureValue): RawValue | undefined;
    getSecureRef(raw: RawValue): SecureValue | undefined;
    setRefMapEntries(sec: SecureValue, raw: RawValue): void;
}