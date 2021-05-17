export type BlueValue = any;
export type BlueArray = BlueValue[];
export type BlueFunction = (...args: BlueValue[]) => BlueValue;
export type BlueObject = object;
export interface BlueConstructor {
    new(...args: any[]): BlueObject;
}
export type RedProxyTarget = BlueObject | BlueFunction | BlueConstructor;
export type BlueProxyTarget = RedObject | RedFunction | RedConstructor;
// TODO: how to doc the ProxyOf<>
export type RedShadowTarget = RedProxyTarget; // Proxy<RedProxyTarget>;
export type BlueShadowTarget = BlueProxyTarget; // Proxy<BlueProxyTarget>;

export type RedValue = any;
export type RedFunction = (...args: RedValue[]) => RedValue;
export type RedArray = RedValue[];
export type RedObject = object;
export interface RedConstructor {
    new(...args: any[]): RedObject;
}

export interface TargetMeta {
    proto: null | RedProxyTarget | BlueProxyTarget;
    descriptors: PropertyDescriptorMap;
    isFrozen?: boolean;
    isSealed?: boolean;
    isExtensible?: boolean;
    isBroken?: boolean;
}

export type RedProxy = RedObject | RedFunction;
export type BlueProxy = BlueObject | BlueFunction;

export interface MembraneBroker {
    // map from red to blue references
    redMap: WeakMap<RedFunction | RedObject, RedProxyTarget | BlueProxy>;
    // map from blue to red references
    blueMap: WeakMap<BlueFunction | BlueObject, RedProxy | BlueProxyTarget>;
    // blue object distortion map
    distortionCallback: (originalTarget: RedProxyTarget) => RedProxyTarget;

    getBlueValue(red: RedValue): BlueValue;
    getRedValue(blue: BlueValue): RedValue;
    getBlueRef(red: RedValue): BlueValue | undefined;
    getRedRef(blue: BlueValue): RedValue | undefined;
    setRefMapEntries(red: RedValue, blue: BlueValue): void;
}

export interface EnvironmentOptions {
    distortionCallback?: (originalTarget: RedProxyTarget) => RedProxyTarget;
    endowments?: object;
}
