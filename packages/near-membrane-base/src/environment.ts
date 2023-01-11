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
    CallableEvaluate,
    CallableGetPropertyValuePointer,
    CallableInstallLazyPropertyDescriptors,
    CallableLinkPointers,
    CallableSetPrototypeOf,
    GetSelectedTarget,
    GetTransferableValue,
    HooksCallback,
    Pointer,
    VirtualEnvironmentOptions,
    CallableTrackAsFastTarget,
} from './types';

const LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL = Symbol.for(
    '@@lockerNearMembraneUndefinedValue'
);

export class VirtualEnvironment {
    private readonly blueCallableGetPropertyValuePointer: CallableGetPropertyValuePointer;

    private readonly blueCallableLinkPointers: CallableLinkPointers;

    private readonly blueGetSelectedTarget: GetSelectedTarget;

    private readonly blueGetTransferableValue: GetTransferableValue;

    private readonly blueGlobalThisPointer: Pointer;

    private readonly redCallableEvaluate: CallableEvaluate;

    private readonly redCallableGetPropertyValuePointer: CallableGetPropertyValuePointer;

    private readonly redCallableLinkPointers: CallableLinkPointers;

    private readonly redCallableSetPrototypeOf: CallableSetPrototypeOf;

    private readonly redCallableDefineProperties: CallableDefineProperties;

    private readonly redCallableInstallLazyPropertyDescriptors: CallableInstallLazyPropertyDescriptors;

    private readonly redCallableTrackAsFastTarget: CallableTrackAsFastTarget;

    private readonly redGlobalThisPointer: Pointer;

    constructor(options: VirtualEnvironmentOptions) {
        if (options === undefined) {
            throw new ErrorCtor('Missing required VirtualEnvironment options.');
        }
        // prettier-ignore
        const {
            blueConnector,
            distortionCallback,
            instrumentation,
            liveTargetCallback,
            redConnector,
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
            21: blueCallableDebugInfo,
            // 22: blueCallableDefineProperties,
            23: blueCallableGetLazyPropertyDescriptorStateByTarget,
            24: blueCallableGetPropertyValue,
            25: blueCallableGetTargetIntegrityTraits,
            26: blueCallableGetToStringTagOfTarget,
            27: blueCallableInstallErrorPrepareStackTrace,
            // 28: blueCallableInstallLazyPropertyDescriptors,
            29: blueCallableIsTargetLive,
            30: blueCallableIsTargetRevoked,
            31: blueCallableSerializeTarget,
            32: blueCallableSetLazyPropertyDescriptorStateByTarget,
            // 33: blueTrackAsFastTarget,
            34: blueCallableBatchGetPrototypeOfAndGetOwnPropertyDescriptors,
            35: blueCallableBatchGetPrototypeOfWhenHasNoOwnProperty,
            36: blueCallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor,
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
            24: redCallableGetPropertyValue,
            25: redCallableGetTargetIntegrityTraits,
            26: redCallableGetToStringTagOfTarget,
            27: redCallableInstallErrorPrepareStackTrace,
            28: redCallableInstallLazyPropertyDescriptors,
            29: redCallableIsTargetLive,
            30: redCallableIsTargetRevoked,
            31: redCallableSerializeTarget,
            32: redCallableSetLazyPropertyDescriptorStateByTarget,
            33: redCallableTrackAsFastTarget,
            34: redCallableBatchGetPrototypeOfAndGetOwnPropertyDescriptors,
            35: redCallableBatchGetPrototypeOfWhenHasNoOwnProperty,
            36: redCallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor,
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
            redCallableGetPropertyValue,
            redCallableGetTargetIntegrityTraits,
            redCallableGetToStringTagOfTarget,
            redCallableInstallErrorPrepareStackTrace,
            noop, // redCallableInstallLazyPropertyDescriptors,
            redCallableIsTargetLive,
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
            blueCallableDebugInfo,
            noop, // blueCallableDefineProperties,
            blueCallableGetLazyPropertyDescriptorStateByTarget,
            blueCallableGetPropertyValue,
            blueCallableGetTargetIntegrityTraits,
            blueCallableGetToStringTagOfTarget,
            blueCallableInstallErrorPrepareStackTrace,
            noop, // blueCallableInstallLazyPropertyDescriptors,
            blueCallableIsTargetLive,
            blueCallableIsTargetRevoked,
            blueCallableSerializeTarget,
            blueCallableSetLazyPropertyDescriptorStateByTarget,
            noop, // blueCallableTrackAsFastTarget,
            blueCallableBatchGetPrototypeOfAndGetOwnPropertyDescriptors,
            blueCallableBatchGetPrototypeOfWhenHasNoOwnProperty,
            blueCallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor
        );
        this.blueGlobalThisPointer = blueGlobalThisPointer!;
        this.blueGetSelectedTarget = blueGetSelectedTarget!;
        this.blueGetTransferableValue = blueGetTransferableValue!;
        this.blueCallableGetPropertyValuePointer = blueCallableGetPropertyValuePointer!;
        this.blueCallableLinkPointers = blueCallableLinkPointers!;

        this.redGlobalThisPointer = redGlobalThisPointer!;
        this.redCallableGetPropertyValuePointer = redCallableGetPropertyValuePointer!;
        this.redCallableEvaluate = redCallableEvaluate!;
        this.redCallableLinkPointers = redCallableLinkPointers!;
        this.redCallableSetPrototypeOf = redCallableSetPrototypeOf;
        this.redCallableDefineProperties = redCallableDefineProperties!;
        this.redCallableInstallLazyPropertyDescriptors = redCallableInstallLazyPropertyDescriptors!;
        this.redCallableTrackAsFastTarget = redCallableTrackAsFastTarget!;
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
