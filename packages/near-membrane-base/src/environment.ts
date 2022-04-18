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

    constructor(providedOptions: VirtualEnvironmentOptions) {
        if (providedOptions === undefined) {
            throw new ErrorCtor('Missing VirtualEnvironmentOptions options bag.');
        }
        // prettier-ignore
        const {
            blueConnector,
            redConnector,
            distortionCallback,
            instrumentation,
            // eslint-disable-next-line prefer-object-spread
        } = ObjectAssign({ __proto__: null }, providedOptions);
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
            6: blueCallablePushTarget,
            7: blueCallableApply,
            8: blueCallableConstruct,
            9: blueCallableDefineProperty,
            10: blueCallableDeleteProperty,
            11: blueCallableGet,
            12: blueCallableGetOwnPropertyDescriptor,
            13: blueCallableGetPrototypeOf,
            14: blueCallableHas,
            15: blueCallableIsExtensible,
            16: blueCallableOwnKeys,
            17: blueCallablePreventExtensions,
            18: blueCallableSet,
            19: blueCallableSetPrototypeOf,
            20: blueCallableDebugInfo,
            // 21: blueCallableDefineProperties,
            22: blueCallableGetLazyPropertyDescriptorStateByTarget,
            23: blueCallableGetTargetIntegrityTraits,
            24: blueCallableGetToStringTagOfTarget,
            25: blueCallableInstallErrorPrepareStackTrace,
            // 26: blueCallableInstallLazyPropertyDescriptors,
            27: blueCallableIsTargetLive,
            28: blueCallableIsTargetRevoked,
            29: blueCallableSerializeTarget,
            30: blueCallableSetLazyPropertyDescriptorStateByTarget,
            31: blueCallableBatchGetPrototypeOfAndGetOwnPropertyDescriptors,
            32: blueCallableBatchGetPrototypeOfWhenHasNoOwnProperty,
            33: blueCallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor,
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
            6: redCallablePushTarget,
            7: redCallableApply,
            8: redCallableConstruct,
            9: redCallableDefineProperty,
            10: redCallableDeleteProperty,
            11: redCallableGet,
            12: redCallableGetOwnPropertyDescriptor,
            13: redCallableGetPrototypeOf,
            14: redCallableHas,
            15: redCallableIsExtensible,
            16: redCallableOwnKeys,
            17: redCallablePreventExtensions,
            18: redCallableSet,
            19: redCallableSetPrototypeOf,
            20: redCallableDebugInfo,
            21: redCallableDefineProperties,
            22: redCallableGetLazyPropertyDescriptorStateByTarget,
            23: redCallableGetTargetIntegrityTraits,
            24: redCallableGetToStringTagOfTarget,
            25: redCallableInstallErrorPrepareStackTrace,
            26: redCallableInstallLazyPropertyDescriptors,
            27: redCallableIsTargetLive,
            28: redCallableIsTargetRevoked,
            29: redCallableSerializeTarget,
            30: redCallableSetLazyPropertyDescriptorStateByTarget,
            31: redCallableBatchGetPrototypeOfAndGetOwnPropertyDescriptors,
            32: redCallableBatchGetPrototypeOfWhenHasNoOwnProperty,
            33: redCallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor,
        } = redHooks!;
        blueConnect(
            undefined, // redGlobalThisPointer,
            undefined, // redGetSelectedTarget,
            undefined, // redGetTransferableValue,
            undefined, // redCallableGetPropertyValuePointer,
            undefined, // redCallableEvaluate,
            undefined, // redCallableLinkPointers,
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
        const args = new ArrayCtor(
            1 + length * 7
        ) as unknown as Parameters<CallableDefineProperties>;
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
