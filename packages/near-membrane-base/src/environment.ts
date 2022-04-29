import { Instrumentation } from './instrumentation';
import {
    createMembraneMarshall,
    CallableDefineProperties,
    CallableEvaluate,
    CallableGetPropertyValuePointer,
    CallableInstallLazyPropertyDescriptors,
    CallableLinkPointers,
    CallableSetPrototypeOf,
    DistortionCallback,
    GetSelectedTarget,
    GetTransferableValue,
    HooksCallback,
    Pointer,
    ProxyTarget,
} from './membrane';
import { PropertyKeys } from './types';

interface VirtualEnvironmentOptions {
    // Blue connector factory.
    blueConnector: ReturnType<typeof createMembraneMarshall>;
    // Optional distortion callback to tame functionalities observed through the membrane.
    distortionCallback?: DistortionCallback;
    // Red connector factory.
    redConnector: ReturnType<typeof createMembraneMarshall>;
    // Instrumentation library object.
    instrumentation?: Instrumentation;
}

const LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL = Symbol.for(
    '@@lockerNearMembraneUndefinedValue'
);
const ArrayCtor = Array;
const ErrorCtor = Error;
const ObjectCtor = Object;
const { push: ArrayProtoPush } = ArrayCtor.prototype;
const { assign: ObjectAssign } = ObjectCtor;
const { apply: ReflectApply, ownKeys: ReflectOwnKeys } = Reflect;

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

    private readonly redGlobalThisPointer: Pointer;

    constructor(options: VirtualEnvironmentOptions) {
        if (options === undefined) {
            throw new ErrorCtor('Missing VirtualEnvironmentOptions options bag.');
        }
        // prettier-ignore
        const {
            blueConnector,
            distortionCallback,
            instrumentation,
            redConnector,
            // eslint-disable-next-line prefer-object-spread
        } = ObjectAssign({ __proto__: null }, options);
        let blueHooks: Parameters<HooksCallback>;
        const blueConnect = blueConnector(
            'blue',
            (...hooks) => {
                blueHooks = hooks;
            },
            {
                distortionCallback,
                instrumentation,
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
            24: blueCallableGetTargetIntegrityTraits,
            25: blueCallableGetToStringTagOfTarget,
            26: blueCallableInstallErrorPrepareStackTrace,
            // 27: blueCallableInstallLazyPropertyDescriptors,
            28: blueCallableIsTargetLive,
            29: blueCallableIsTargetRevoked,
            30: blueCallableSerializeTarget,
            31: blueCallableSetLazyPropertyDescriptorStateByTarget,
            32: blueCallableBatchGetPrototypeOfAndGetOwnPropertyDescriptors,
            33: blueCallableBatchGetPrototypeOfWhenHasNoOwnProperty,
            34: blueCallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor,
        } = blueHooks!;
        let redHooks: Parameters<HooksCallback>;
        const redConnect = redConnector('red', (...hooks) => {
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
            24: redCallableGetTargetIntegrityTraits,
            25: redCallableGetToStringTagOfTarget,
            26: redCallableInstallErrorPrepareStackTrace,
            27: redCallableInstallLazyPropertyDescriptors,
            28: redCallableIsTargetLive,
            29: redCallableIsTargetRevoked,
            30: redCallableSerializeTarget,
            31: redCallableSetLazyPropertyDescriptorStateByTarget,
            32: redCallableBatchGetPrototypeOfAndGetOwnPropertyDescriptors,
            33: redCallableBatchGetPrototypeOfWhenHasNoOwnProperty,
            34: redCallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor,
        } = redHooks!;
        blueConnect(
            undefined, // redGlobalThisPointer,
            undefined, // redGetSelectedTarget,
            undefined, // redGetTransferableValue,
            undefined, // redCallableGetPropertyValuePointer,
            undefined, // redCallableEvaluate,
            undefined, // redCallableLinkPointers,
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
            undefined, // redCallableDefineProperties,
            redCallableGetLazyPropertyDescriptorStateByTarget,
            redCallableGetTargetIntegrityTraits,
            redCallableGetToStringTagOfTarget,
            redCallableInstallErrorPrepareStackTrace,
            undefined, // redCallableInstallLazyPropertyDescriptors,
            redCallableIsTargetLive,
            redCallableIsTargetRevoked,
            redCallableSerializeTarget,
            redCallableSetLazyPropertyDescriptorStateByTarget,
            redCallableBatchGetPrototypeOfAndGetOwnPropertyDescriptors,
            redCallableBatchGetPrototypeOfWhenHasNoOwnProperty,
            redCallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor
        );
        redConnect(
            undefined, // blueGlobalThisPointer,
            undefined, // blueGetSelectedTarget,
            undefined, // blueGetTransferableValue,
            undefined, // blueCallableGetPropertyValuePointer,
            undefined, // blueCallableEvaluate,
            undefined, // blueCallableLinkPointers,
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
            undefined, // blueCallableDefineProperties,
            blueCallableGetLazyPropertyDescriptorStateByTarget,
            blueCallableGetTargetIntegrityTraits,
            blueCallableGetToStringTagOfTarget,
            blueCallableInstallErrorPrepareStackTrace,
            undefined, // blueCallableInstallLazyPropertyDescriptors,
            blueCallableIsTargetLive,
            blueCallableIsTargetRevoked,
            blueCallableSerializeTarget,
            blueCallableSetLazyPropertyDescriptorStateByTarget,
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
        ownKeys: PropertyKeys,
        unforgeableGlobalThisKeys?: PropertyKeys
    ) {
        const targetPointer = this.blueGetTransferableValue(target) as Pointer;
        const args: Parameters<CallableInstallLazyPropertyDescriptors> = [targetPointer];
        ReflectApply(ArrayProtoPush, args, ownKeys);
        if (unforgeableGlobalThisKeys?.length) {
            // Use `LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL` to delimit
            // `ownKeys` and `unforgeableGlobalThisKeys`.
            args[args.length] = LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
            ReflectApply(ArrayProtoPush, args, unforgeableGlobalThisKeys);
        }
        ReflectApply(this.redCallableInstallLazyPropertyDescriptors, undefined, args);
    }

    link(...keys: PropertyKeys) {
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

    remapProperties(target: ProxyTarget, unsafeBlueDescMap: PropertyDescriptorMap) {
        const targetPointer = this.blueGetTransferableValue(target) as Pointer;
        const ownKeys = ReflectOwnKeys(unsafeBlueDescMap);
        const { length } = ownKeys;
        const args = new ArrayCtor(1 + length * 7) as Parameters<CallableDefineProperties>;
        args[0] = targetPointer;
        for (let i = 0, j = 1; i < length; i += 1, j += 7) {
            const ownKey = ownKeys[i];
            const unsafeBlueDesc = (unsafeBlueDescMap as any)[ownKey];
            // Avoid poisoning by only installing own properties from unsafeBlueDescMap.
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

    remapProto(target: ProxyTarget, proto: object | null) {
        const foreignTargetPointer = this.blueGetTransferableValue(target) as Pointer;
        const transferableProto = proto ? (this.blueGetTransferableValue(proto) as Pointer) : proto;
        this.redCallableSetPrototypeOf(foreignTargetPointer, transferableProto);
    }
}
