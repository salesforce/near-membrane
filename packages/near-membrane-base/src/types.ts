import type {
    Getter,
    NearMembraneSerializedValue as SerializedValue,
    ProxyTarget,
} from '@locker/near-membrane-shared/types';

export interface Activity {
    stop(data?: DataType): void;
    error(data?: DataType): void;
}
export type CallableApply = (
    targetPointer: Pointer,
    thisArgPointerOrUndefined: PointerOrPrimitive,
    ...args: PointerOrPrimitive[]
) => PointerOrPrimitive;
export type CallableBatchGetPrototypeOfAndGetOwnPropertyDescriptors = (
    targetPointer: Pointer,
    foreignCallableDescriptorsCallback: CallableDescriptorsCallback
) => PointerOrPrimitive;
export type CallableBatchGetPrototypeOfWhenHasNoOwnProperty = (
    targetPointer: Pointer,
    key: PropertyKey
) => PointerOrPrimitive;
export type CallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor = (
    targetPointer: Pointer,
    key: PropertyKey,
    foreignCallableDescriptorCallback: CallableDescriptorCallback
) => PointerOrPrimitive;
export type CallableConstruct = (
    targetPointer: Pointer,
    newTargetPointer: PointerOrPrimitive,
    ...args: PointerOrPrimitive[]
) => PointerOrPrimitive;
export type CallableDebugInfo = (...args: Parameters<typeof console.info>) => void;
export type CallableDefineProperties = (
    targetPointer: Pointer,
    ...descriptorTuples: [...Parameters<CallableDescriptorCallback>]
) => void;
export type CallableDefineProperty = (
    targetPointer: Pointer,
    key: PropertyKey,
    configurable: boolean | symbol,
    enumerable: boolean | symbol,
    writable: boolean | symbol,
    valuePointer: PointerOrPrimitive,
    getterPointer: PointerOrPrimitive,
    setterPointer: PointerOrPrimitive,
    foreignCallableNonConfigurableDescriptorCallback: CallableNonConfigurableDescriptorCallback
) => boolean;
export type CallableDeleteProperty = (targetPointer: Pointer, key: PropertyKey) => boolean;
export type CallableDescriptorCallback = (
    key: PropertyKey,
    configurable: boolean | symbol,
    enumerable: boolean | symbol,
    writable: boolean | symbol,
    valuePointer: PointerOrPrimitive,
    getterPointer: PointerOrPrimitive,
    setterPointer: PointerOrPrimitive
) => void;
export type CallableDescriptorsCallback = (
    ...descriptorTuples: [...Parameters<CallableDescriptorCallback>]
) => void;
export type CallableEvaluate = (sourceText: string) => PointerOrPrimitive;
export type CallableGet = (
    targetPointer: Pointer,
    targetTraits: number,
    key: PropertyKey,
    receiverPointerOrPrimitive: PointerOrPrimitive
) => PointerOrPrimitive;
export type CallableGetPropertyValue = (
    targetPointer: Pointer,
    index: PropertyKey
) => PointerOrPrimitive;
export type CallableGetLazyPropertyDescriptorStateByTarget = (
    targetPointer: Pointer
) => PointerOrPrimitive;
export type CallableGetOwnPropertyDescriptor = (
    targetPointer: Pointer,
    key: PropertyKey,
    foreignCallableDescriptorCallback: CallableDescriptorCallback
) => void;
export type CallableGetPropertyValuePointer = (targetPointer: Pointer, key: PropertyKey) => Pointer;
export type CallableGetPrototypeOf = (targetPointer: Pointer) => PointerOrPrimitive;
export type CallableGetTargetIntegrityTraits = (targetPointer: Pointer) => number;
export type CallableGetToStringTagOfTarget = (targetPointer: Pointer) => string;
export type CallableHas = (targetPointer: Pointer, key: PropertyKey) => boolean;
export type CallableInstallErrorPrepareStackTrace = () => void;
export type CallableInstallLazyPropertyDescriptors = (
    targetPointer: Pointer,
    ...ownKeysAndUnforgeableGlobalThisKeys: PropertyKey[]
) => void;
export type CallableIsExtensible = (targetPointer: Pointer) => boolean;
export type CallableIsTargetLive = (targetPointer: Pointer, targetTraits: number) => boolean;
export type CallableIsTargetRevoked = (targetPointer: Pointer) => boolean;
export type CallableLinkPointers = (targetPointer: Pointer, foreignTargetPointer: Pointer) => void;
export type CallableNonConfigurableDescriptorCallback = CallableDescriptorCallback;
export type CallableOwnKeys = (
    targetPointer: Pointer,
    foreignCallableKeysCallback: (...args: ReturnType<typeof Reflect.ownKeys>) => void
) => void;
export type CallablePreventExtensions = (targetPointer: Pointer) => number;
export type CallablePushErrorTarget = CallablePushTarget;
export type CallablePushTarget = (
    foreignTargetPointer: () => void,
    foreignTargetTraits: number,
    foreignTargetFunctionArity: number,
    foreignTargetFunctionName: string,
    foreignTargetTypedArrayLength: number
) => Pointer;
export type CallableSerializeTarget = (targetPointer: Pointer) => SerializedValue | undefined;
export type CallableSetLazyPropertyDescriptorStateByTarget = (
    targetPointer: Pointer,
    statePointer: Pointer
) => void;
export type CallableSet = (
    targetPointer: Pointer,
    key: PropertyKey,
    valuePointerOrPrimitive: PointerOrPrimitive,
    receiverPointerOrPrimitive: PointerOrPrimitive
) => boolean;
export type CallableSetPrototypeOf = (
    targetPointer: Pointer,
    protoPointerOrNull: Pointer | null
) => boolean;
export type CallableTrackAsFastTarget = (targetPointer: Pointer) => void;
export type Connector = (
    color: string,
    foreignCallableHooksCallback: HooksCallback,
    options?: HooksOptions | undefined
) => HooksCallback;
export type DataType = boolean | object | number | string;
export type DistortionCallback = (target: ProxyTarget) => ProxyTarget;
export interface ForeignPropertyDescriptor extends PropertyDescriptor {
    foreign?: boolean;
}
export type GetSelectedTarget = Getter;
export type GetTransferableValue = (value: any) => PointerOrPrimitive;
export type GlobalThisGetter = () => typeof globalThis;
export type HooksCallback = (
    globalThisPointer: Pointer,
    getSelectedTarget: GetSelectedTarget,
    getTransferableValue: GetTransferableValue,
    callableGetPropertyValuePointer: CallableGetPropertyValuePointer,
    callableEvaluate: CallableEvaluate,
    callableLinkPointers: CallableLinkPointers,
    callablePushErrorTarget: CallablePushErrorTarget,
    callablePushTarget: CallablePushTarget,
    callableApply: CallableApply,
    callableConstruct: CallableConstruct,
    callableDefineProperty: CallableDefineProperty,
    callableDeleteProperty: CallableDeleteProperty,
    callableGet: CallableGet,
    callableGetOwnPropertyDescriptor: CallableGetOwnPropertyDescriptor,
    callableGetPrototypeOf: CallableGetPrototypeOf,
    callableHas: CallableHas,
    callableIsExtensible: CallableIsExtensible,
    callableOwnKeys: CallableOwnKeys,
    callablePreventExtensions: CallablePreventExtensions,
    callableSet: CallableSet,
    callableSetPrototypeOf: CallableSetPrototypeOf,
    callableDebugInfo: CallableDebugInfo,
    callableDefineProperties: CallableDefineProperties,
    callableGetLazyPropertyDescriptorStateByTarget: CallableGetLazyPropertyDescriptorStateByTarget,
    callableGetPropertyValue: CallableGetPropertyValue,
    callableGetTargetIntegrityTraits: CallableGetTargetIntegrityTraits,
    callableGetToStringTagOfTarget: CallableGetToStringTagOfTarget,
    callableInstallErrorPrepareStackTrace: CallableInstallErrorPrepareStackTrace,
    callableInstallLazyPropertyDescriptors: CallableInstallLazyPropertyDescriptors,
    callableIsTargetLive: CallableIsTargetLive,
    callableIsTargetRevoked: CallableIsTargetRevoked,
    callableSerializeTarget: CallableSerializeTarget,
    callableSetLazyPropertyDescriptorStateByTarget: CallableSetLazyPropertyDescriptorStateByTarget,
    callableTrackAsFastTarget: CallableTrackAsFastTarget,
    callableBatchGetPrototypeOfAndGetOwnPropertyDescriptors: CallableBatchGetPrototypeOfAndGetOwnPropertyDescriptors,
    callableBatchGetPrototypeOfWhenHasNoOwnProperty: CallableBatchGetPrototypeOfWhenHasNoOwnProperty,
    callableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor: CallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor
) => void;
export interface HooksOptions {
    distortionCallback?: DistortionCallback;
    instrumentation?: Instrumentation;
    liveTargetCallback?: LiveTargetCallback;
}
export interface Instrumentation {
    startActivity(activityName: string, data?: DataType): Activity;
    log(data?: DataType): void;
    error(data?: DataType): void;
}
export type LiveTargetCallback = (target: ProxyTarget, targetTraits: number) => boolean;
export type Pointer = CallableFunction;
export type PointerOrPrimitive = Pointer | Primitive;
export type Primitive = bigint | boolean | null | number | string | symbol | undefined;
export type { SerializedValue };
export type ShadowTarget = ProxyTarget;
export interface VirtualEnvironmentOptions {
    blueConnector: Connector;
    redConnector: Connector;
    distortionCallback?: DistortionCallback;
    instrumentation?: Instrumentation;
    liveTargetCallback?: LiveTargetCallback;
}
