export type BlueArray = BlueValue[];
export type BlueFunction = (...args: BlueValue[]) => BlueValue;
export type BlueObject = object;
export type BlueProxy = BlueObject | BlueFunction;
export type BlueProxyTarget = RedObject | RedFunction | RedConstructor;
// TODO: how to doc the ProxyOf<>
export type BlueShadowTarget = BlueProxyTarget; // Proxy<BlueProxyTarget>;
export type BlueValue = any;
export type BlueArrayOrObject = BlueArray | BlueObject;

export interface BlueConstructor {
    new (...args: any[]): BlueObject;
}

export interface EnvironmentOptions {
    distortionCallback?: (originalTarget: RedProxyTarget) => RedProxyTarget;
    endowments?: object;
}
export interface MembraneBroker {
    // map from red to blue references
    redMap: WeakMap<RedFunction | RedObject, RedProxyTarget | BlueProxy>;
    // map from blue to red references
    blueMap: WeakMap<BlueFunction | BlueObject, RedProxy | BlueProxyTarget>;
    // blue object distortion map
    distortionCallback: (originalTarget: RedProxyTarget) => RedProxyTarget;

    getBlueValue(red: RedValue): BlueValue;
    getRedValue(blue: BlueValue): RedValue;
    setRefMapEntries(red: RedValue, blue: BlueValue): void;
}

// Relevant:
// - https://github.com/microsoft/TypeScript/issues/38385
// - https://github.com/microsoft/TypeScript/pull/42359
type NullProtoMap = {
    [key in string | symbol | number]: any;
} & {
    __proto__: string | null;
};

export type RedArray = RedValue[];
export type RedFunction = (...args: RedValue[]) => RedValue;
export type RedObject = object;
export type RedProxy = RedObject | RedFunction;
export type RedProxyTarget = BlueObject | BlueFunction | BlueConstructor;
export type RedShadowTarget = RedProxyTarget; // Proxy<RedProxyTarget>;
export type RedValue = any;
export type RedArrayOrObject = RedArray | RedObject;

export interface RedConstructor {
    new (...args: any[]): RedObject;
}

export interface TargetMeta extends NullProtoMap {
    proto: null | RedProxyTarget | BlueProxyTarget;
    descriptors: PropertyDescriptorMap | null;
    isFrozen?: boolean;
    isSealed?: boolean;
    isExtensible?: boolean;
    isBroken?: boolean;
}
