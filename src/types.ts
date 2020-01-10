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

export interface SecureRecord {
    // Ref to a value created inside the sandbox or a reverse proxy from another sandbox.
    raw: SecureProxyTarget | ReverseProxy;
    // Proxy of an reference from the outer realm or from another sandbox.
    sec: SecureProxy | ReverseProxyTarget;
}

export type DistortionMap = WeakMap<SecureProxyTarget, SecureProxyTarget>;

export interface MembraneBroker {
    // secure object map
    som: WeakMap<SecureFunction | SecureObject, SecureRecord>;
    // raw object map
    rom: WeakMap<RawFunction | RawObject, SecureRecord>;
    // raw object distortion map
    distortionMap: DistortionMap;

    getRawValue(sec: SecureValue): RawValue;
    getSecureValue(raw: RawValue): SecureValue;
    getRawRef(sec: SecureValue): RawValue | undefined;
    getSecureRef(raw: RawValue): SecureValue | undefined;
    createSecureRecord(sec: SecureValue, raw: RawValue): void;
}