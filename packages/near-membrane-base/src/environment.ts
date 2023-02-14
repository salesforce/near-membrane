import {
    ArrayCtor,
    ArrayProtoPush,
    ErrorCtor,
    noop,
    ObjectAssign,
    ReflectApply,
    ReflectOwnKeys,
} from '@locker/near-membrane-shared';
import type { ProxyTarget } from '@locker/near-membrane-shared/types';
import type {
    CallableDefineProperties,
    CallableDescriptorCallback,
    CallableEvaluate,
    CallableGetPropertyValuePointer,
    CallableInstallDateProtoToJSON,
    CallableInstallJSONStringify,
    CallableInstallLazyPropertyDescriptors,
    CallableIsTargetLive,
    CallableIsTargetRevoked,
    CallableLinkPointers,
    CallableSerializeTarget,
    CallableSetPrototypeOf,
    CallableTrackAsFastTarget,
    GetSelectedTarget,
    GetTransferableValue,
    HooksCallback,
    Pointer,
    VirtualEnvironmentOptions,
} from './types';

const LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL = Symbol.for(
    '@@lockerNearMembraneUndefinedValue'
);

const { prototype: DateProto } = Date;
const { toJSON: DateProtoToJSON } = DateProto;
const WindowJSON = JSON;

const installableDateToJSON = function toJSON(
    this: Date,
    ...args: Parameters<typeof Date.prototype.toJSON>
): ReturnType<typeof Date.prototype.toJSON> {
    // This pass through method invokes the native blue `Date.prototype.toJSON`
    // method with the proxy unwrapped version of `this`.
    // istanbul ignore next: called within un-instrumented createMembraneMarshall
    return ReflectApply(DateProtoToJSON, this, args);
};

export class VirtualEnvironment {
    private readonly blueCallableGetPropertyValuePointer: CallableGetPropertyValuePointer;

    private readonly blueCallableLinkPointers: CallableLinkPointers;

    private readonly blueGetSelectedTarget: GetSelectedTarget;

    private readonly blueGetTransferableValue: GetTransferableValue;

    private readonly blueGlobalThisPointer: Pointer;

    private readonly redCallableDefineProperties: CallableDefineProperties;

    private readonly redCallableEvaluate: CallableEvaluate;

    private readonly redCallableGetPropertyValuePointer: CallableGetPropertyValuePointer;

    private readonly redCallableInstallDateProtoToJSON: CallableInstallDateProtoToJSON;

    private readonly redCallableInstallJSONStringify: CallableInstallJSONStringify;

    private readonly redCallableInstallLazyPropertyDescriptors: CallableInstallLazyPropertyDescriptors;

    private readonly redCallableLinkPointers: CallableLinkPointers;

    private readonly redCallableSetPrototypeOf: CallableSetPrototypeOf;

    private readonly redCallableTrackAsFastTarget: CallableTrackAsFastTarget;

    private readonly redGlobalThisPointer: Pointer;

    constructor(options: VirtualEnvironmentOptions) {
        if (options === undefined) {
            throw new ErrorCtor('Missing required VirtualEnvironment options.');
        }
        // prettier-ignore
        const {
            blueConnector,
            redConnector,
            distortionCallback,
            instrumentation,
            liveTargetCallback,
            revokedProxyCallback,
            signSourceCallback,
            // eslint-disable-next-line prefer-object-spread
        } = ObjectAssign({ __proto__: null }, options);
        let blueHooks: Parameters<HooksCallback>;
        const blueConnect = blueConnector(
            'blue',
            (...hooks: Parameters<HooksCallback>) => {
                blueHooks = hooks;
            },
            {
                distortionCallback,
                instrumentation,
                liveTargetCallback,
                revokedProxyCallback,
            }
        );
        const {
            0: blueGlobalThisPointer,
            1: blueGetSelectedTarget,
            2: blueGetTransferableValue,
            3: blueCallableGetPropertyValuePointer,
            // 4: blueCallableEvaluate,
            5: blueCallableLinkPointers,
            6: blueCallablePushErrorTarget,
            7: blueCallablePushTarget,
            8: blueCallableApply,
            9: blueCallableConstruct,
            10: blueCallableDefineProperty,
            11: blueCallableDeleteProperty,
            12: blueCallableGet,
            13: blueCallableGetOwnPropertyDescriptor,
            14: blueCallableGetPrototypeOf,
            15: blueCallableHas,
            16: blueCallableIsExtensible,
            17: blueCallableOwnKeys,
            18: blueCallablePreventExtensions,
            19: blueCallableSet,
            20: blueCallableSetPrototypeOf,
            // 21: blueCallableDebugInfo,
            // 22: blueCallableDefineProperties,
            23: blueCallableGetLazyPropertyDescriptorStateByTarget,
            24: blueCallableGetPropertyValue,
            25: blueCallableGetTargetIntegrityTraits,
            26: blueCallableGetToStringTagOfTarget,
            // 27: blueCallableInstallDateProtoToJSON,
            28: blueCallableInstallErrorPrepareStackTrace,
            // 29: blueCallableInstallJSONStringify,
            // 30: blueCallableInstallLazyPropertyDescriptors,
            31: blueCallableIsTargetLive,
            // 32: blueCallableIsTargetRevoked,
            // 33: blueCallableSerializeTarget,
            34: blueCallableSetLazyPropertyDescriptorStateByTarget,
            // 35: blueTrackAsFastTarget,
            36: blueCallableBatchGetPrototypeOfAndGetOwnPropertyDescriptors,
            37: blueCallableBatchGetPrototypeOfWhenHasNoOwnProperty,
            38: blueCallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor,
        } = blueHooks!;
        let redHooks: Parameters<HooksCallback>;
        const redConnect = redConnector('red', (...hooks: Parameters<HooksCallback>) => {
            redHooks = hooks;
        });
        const {
            0: redGlobalThisPointer,
            // 1: redGetSelectedTarget,
            // 2: redGetTransferableValue,
            3: redCallableGetPropertyValuePointer,
            4: redCallableEvaluate,
            5: redCallableLinkPointers,
            6: redCallablePushErrorTarget,
            7: redCallablePushTarget,
            8: redCallableApply,
            9: redCallableConstruct,
            10: redCallableDefineProperty,
            11: redCallableDeleteProperty,
            12: redCallableGet,
            13: redCallableGetOwnPropertyDescriptor,
            14: redCallableGetPrototypeOf,
            15: redCallableHas,
            16: redCallableIsExtensible,
            17: redCallableOwnKeys,
            18: redCallablePreventExtensions,
            19: redCallableSet,
            20: redCallableSetPrototypeOf,
            21: redCallableDebugInfo,
            22: redCallableDefineProperties,
            23: redCallableGetLazyPropertyDescriptorStateByTarget,
            // 24: redCallableGetPropertyValue,
            25: redCallableGetTargetIntegrityTraits,
            26: redCallableGetToStringTagOfTarget,
            27: redCallableInstallDateProtoToJSON,
            28: redCallableInstallErrorPrepareStackTrace,
            29: redCallableInstallJSONStringify,
            30: redCallableInstallLazyPropertyDescriptors,
            // 31: redCallableIsTargetLive,
            32: redCallableIsTargetRevoked,
            33: redCallableSerializeTarget,
            34: redCallableSetLazyPropertyDescriptorStateByTarget,
            35: redCallableTrackAsFastTarget,
            36: redCallableBatchGetPrototypeOfAndGetOwnPropertyDescriptors,
            37: redCallableBatchGetPrototypeOfWhenHasNoOwnProperty,
            38: redCallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor,
        } = redHooks!;
        blueConnect(
            noop, // redGlobalThisPointer,
            noop, // redGetSelectedTarget,
            noop as GetTransferableValue, // redGetTransferableValue,
            noop as unknown as CallableGetPropertyValuePointer, // redCallableGetPropertyValuePointer,
            noop as CallableEvaluate, // redCallableEvaluate,
            noop, // redCallableLinkPointers,
            redCallablePushErrorTarget,
            redCallablePushTarget,
            redCallableApply,
            redCallableConstruct,
            redCallableDefineProperty,
            redCallableDeleteProperty,
            redCallableGet,
            redCallableGetOwnPropertyDescriptor,
            redCallableGetPrototypeOf,
            redCallableHas,
            redCallableIsExtensible,
            redCallableOwnKeys,
            redCallablePreventExtensions,
            redCallableSet,
            redCallableSetPrototypeOf,
            redCallableDebugInfo,
            noop, // redCallableDefineProperties,
            redCallableGetLazyPropertyDescriptorStateByTarget,
            noop, // redCallableGetPropertyValue,
            redCallableGetTargetIntegrityTraits,
            redCallableGetToStringTagOfTarget,
            noop, // redCallableInstallDateProtoToJSON,
            redCallableInstallErrorPrepareStackTrace,
            noop, // redCallableInstallJSONStringify
            noop, // redCallableInstallLazyPropertyDescriptors,
            noop as unknown as CallableIsTargetLive, // redCallableIsTargetLive,
            redCallableIsTargetRevoked,
            redCallableSerializeTarget,
            redCallableSetLazyPropertyDescriptorStateByTarget,
            redCallableTrackAsFastTarget,
            redCallableBatchGetPrototypeOfAndGetOwnPropertyDescriptors,
            redCallableBatchGetPrototypeOfWhenHasNoOwnProperty,
            redCallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor
        );
        redConnect(
            noop, // blueGlobalThisPointer,
            noop, // blueGetSelectedTarget,
            noop as GetTransferableValue, // blueGetTransferableValue,
            noop as unknown as CallableGetPropertyValuePointer, // blueCallableGetPropertyValuePointer,
            noop as CallableEvaluate, // blueCallableEvaluate,
            noop, // blueCallableLinkPointers,
            blueCallablePushErrorTarget,
            blueCallablePushTarget,
            blueCallableApply,
            blueCallableConstruct,
            blueCallableDefineProperty,
            blueCallableDeleteProperty,
            blueCallableGet,
            blueCallableGetOwnPropertyDescriptor,
            blueCallableGetPrototypeOf,
            blueCallableHas,
            blueCallableIsExtensible,
            blueCallableOwnKeys,
            blueCallablePreventExtensions,
            blueCallableSet,
            blueCallableSetPrototypeOf,
            noop, // blueCallableDebugInfo
            noop, // blueCallableDefineProperties,
            blueCallableGetLazyPropertyDescriptorStateByTarget,
            blueCallableGetPropertyValue,
            blueCallableGetTargetIntegrityTraits,
            blueCallableGetToStringTagOfTarget,
            blueCallableInstallErrorPrepareStackTrace,
            noop, // blueCallableInstallDateProtoToJSON
            noop, // blueCallableInstallJSONStringify
            noop, // blueCallableInstallLazyPropertyDescriptors,
            blueCallableIsTargetLive,
            noop as unknown as CallableIsTargetRevoked, // blueCallableIsTargetRevoked,
            noop as CallableSerializeTarget, // blueCallableSerializeTarget,,
            blueCallableSetLazyPropertyDescriptorStateByTarget,
            noop, // blueCallableTrackAsFastTarget,
            blueCallableBatchGetPrototypeOfAndGetOwnPropertyDescriptors,
            blueCallableBatchGetPrototypeOfWhenHasNoOwnProperty,
            blueCallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor
        );
        this.blueGlobalThisPointer = blueGlobalThisPointer;
        this.blueGetSelectedTarget = blueGetSelectedTarget;
        this.blueGetTransferableValue = blueGetTransferableValue;
        this.blueCallableGetPropertyValuePointer = blueCallableGetPropertyValuePointer;
        this.blueCallableLinkPointers = blueCallableLinkPointers;

        // Ensure the `this` context of red callable functions is `undefined`.
        this.redGlobalThisPointer = () => redGlobalThisPointer();
        this.redCallableGetPropertyValuePointer = (targetPointer: Pointer, key: PropertyKey) =>
            redCallableGetPropertyValuePointer(targetPointer, key);
        this.redCallableEvaluate = signSourceCallback
            ? (sourceText: string) => redCallableEvaluate(signSourceCallback(sourceText))
            : (sourceText: string) => redCallableEvaluate(sourceText);
        this.redCallableLinkPointers = (targetPointer: Pointer, foreignTargetPointer: Pointer) =>
            redCallableLinkPointers(targetPointer, foreignTargetPointer);
        this.redCallableSetPrototypeOf = (
            targetPointer: Pointer,
            protoPointerOrNull: Pointer | null
        ) => redCallableSetPrototypeOf(targetPointer, protoPointerOrNull);
        this.redCallableDefineProperties = (
            targetPointer: Pointer,
            ...descriptorTuples: [...Parameters<CallableDescriptorCallback>]
        ) => {
            const { length } = descriptorTuples;
            const args = new ArrayCtor(length + 1);
            args[0] = targetPointer;
            for (let i = 0; i < length; i += 1) {
                args[i + 1] = descriptorTuples[i];
            }
            ReflectApply(redCallableDefineProperties, undefined, args);
        };
        this.redCallableInstallJSONStringify = (WindowJSONPointer: Pointer) =>
            redCallableInstallJSONStringify(WindowJSONPointer);
        this.redCallableInstallLazyPropertyDescriptors = (
            targetPointer: Pointer,
            ...ownKeysAndUnforgeableGlobalThisKeys: PropertyKey[]
        ) => {
            const { length } = ownKeysAndUnforgeableGlobalThisKeys;
            const args = new ArrayCtor(length + 1);
            args[0] = targetPointer;
            for (let i = 0; i < length; i += 1) {
                args[i + 1] = ownKeysAndUnforgeableGlobalThisKeys[i];
            }
            ReflectApply(redCallableInstallLazyPropertyDescriptors, undefined, args);
        };
        this.redCallableInstallDateProtoToJSON = (
            DateProtoPointer: Pointer,
            DataProtoToJSONPointer: Pointer
        ) => redCallableInstallDateProtoToJSON(DateProtoPointer, DataProtoToJSONPointer);
        this.redCallableTrackAsFastTarget = (targetPointer: Pointer) =>
            redCallableTrackAsFastTarget(targetPointer);
    }

    evaluate(sourceText: string): any {
        try {
            const bluePointerOrPrimitiveValue = this.redCallableEvaluate(sourceText);
            if (typeof bluePointerOrPrimitiveValue === 'function') {
                bluePointerOrPrimitiveValue();
                return this.blueGetSelectedTarget();
            }
            return bluePointerOrPrimitiveValue;
        } catch (error: any) {
            throw this.blueGetSelectedTarget() ?? error;
        }
    }

    installRemapOverrides() {
        const transferableWindowJSON = this.blueGetTransferableValue(WindowJSON) as Pointer;
        this.redCallableTrackAsFastTarget(transferableWindowJSON);
        this.redCallableInstallDateProtoToJSON(
            this.blueGetTransferableValue(DateProto) as Pointer,
            this.blueGetTransferableValue(installableDateToJSON) as Pointer
        );
        this.redCallableInstallJSONStringify(transferableWindowJSON);
    }

    lazyRemapProperties(
        target: ProxyTarget,
        ownKeys: PropertyKey[],
        unforgeableGlobalThisKeys?: PropertyKey[]
    ) {
        if ((typeof target === 'object' && target !== null) || typeof target === 'function') {
            const args: Parameters<CallableInstallLazyPropertyDescriptors> = [
                this.blueGetTransferableValue(target) as Pointer,
            ];
            ReflectApply(ArrayProtoPush, args, ownKeys);
            if (unforgeableGlobalThisKeys?.length) {
                // Use `LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL` to delimit
                // `ownKeys` and `unforgeableGlobalThisKeys`.
                args[args.length] = LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                ReflectApply(ArrayProtoPush, args, unforgeableGlobalThisKeys);
            }
            ReflectApply(this.redCallableInstallLazyPropertyDescriptors, undefined, args);
        }
    }

    link(...keys: PropertyKey[]) {
        let bluePointer = this.blueGlobalThisPointer;
        let redPointer = this.redGlobalThisPointer;
        for (let i = 0, { length } = keys; i < length; i += 1) {
            const key = keys[i];
            bluePointer = this.blueCallableGetPropertyValuePointer(bluePointer, key);
            redPointer = this.redCallableGetPropertyValuePointer(redPointer, key);
            this.redCallableLinkPointers(redPointer, bluePointer);
            this.blueCallableLinkPointers(bluePointer, redPointer);
        }
    }

    remapProperties(target: ProxyTarget, unsafeBlueDescs: PropertyDescriptorMap) {
        if ((typeof target === 'object' && target !== null) || typeof target === 'function') {
            const targetPointer = this.blueGetTransferableValue(target) as Pointer;
            const ownKeys = ReflectOwnKeys(unsafeBlueDescs);
            const { length } = ownKeys;
            const args = new ArrayCtor(1 + length * 7) as Parameters<CallableDefineProperties>;
            args[0] = targetPointer;
            for (let i = 0, j = 1; i < length; i += 1, j += 7) {
                const ownKey = ownKeys[i];
                const unsafeBlueDesc = (unsafeBlueDescs as any)[ownKey];
                // Avoid poisoning by only installing own properties from unsafeBlueDescs.
                // We don't use a toSafeDescriptor() style helper since that mutates
                // the unsafeBlueDesc.
                // eslint-disable-next-line prefer-object-spread
                const safeBlueDesc = ObjectAssign({ __proto__: null }, unsafeBlueDesc);
                args[j] = ownKey;
                args[j + 1] =
                    'configurable' in safeBlueDesc
                        ? !!safeBlueDesc.configurable
                        : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                args[j + 2] =
                    'enumerable' in safeBlueDesc
                        ? !!safeBlueDesc.enumerable
                        : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                args[j + 3] =
                    'writable' in safeBlueDesc
                        ? !!safeBlueDesc.writable
                        : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                args[j + 4] =
                    'value' in safeBlueDesc
                        ? this.blueGetTransferableValue(safeBlueDesc.value)
                        : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                args[j + 5] =
                    'get' in safeBlueDesc
                        ? (this.blueGetTransferableValue(safeBlueDesc.get) as Pointer)
                        : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                args[j + 6] =
                    'set' in safeBlueDesc
                        ? (this.blueGetTransferableValue(safeBlueDesc.set) as Pointer)
                        : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
            }
            ReflectApply(this.redCallableDefineProperties, this, args);
        }
    }

    remapProto(target: ProxyTarget, proto: object | null) {
        if ((typeof target === 'object' && target !== null) || typeof target === 'function') {
            const foreignTargetPointer = this.blueGetTransferableValue(target) as Pointer;
            const transferableProto = proto
                ? (this.blueGetTransferableValue(proto) as Pointer)
                : proto;
            this.redCallableSetPrototypeOf(foreignTargetPointer, transferableProto);
        }
    }

    trackAsFastTarget(target: ProxyTarget) {
        if ((typeof target === 'object' && target !== null) || typeof target === 'function') {
            this.redCallableTrackAsFastTarget(this.blueGetTransferableValue(target) as Pointer);
        }
    }
}
