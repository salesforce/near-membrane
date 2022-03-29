import { Instrumentation } from './instrumentation';
import {
    createMembraneMarshall,
    CallableDefineProperties,
    CallableEvaluate,
    CallableGetPropertyValuePointer,
    CallableInstallLazyDescriptors,
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
const SHOULD_TRAP_MUTATION = true;
const SHOULD_NOT_TRAP_MUTATION = false;

const ArrayCtor = Array;
const ErrorCtor = Error;
const ObjectCtor = Object;
const { push: ArrayProtoPush } = ArrayCtor.prototype;
const { assign: ObjectAssign } = ObjectCtor;
const { apply: ReflectApply, ownKeys: ReflectOwnKeys } = Reflect;

export class VirtualEnvironment {
    public blueConnector: ReturnType<typeof createMembraneMarshall>;

    public redConnector: ReturnType<typeof createMembraneMarshall>;

    private blueCallableGetPropertyValuePointer: CallableGetPropertyValuePointer;

    private blueCallableLinkPointers: CallableLinkPointers;

    private blueGetSelectedTarget: GetSelectedTarget;

    private blueGetTransferableValue: GetTransferableValue;

    private blueGlobalThisPointer: Pointer;

    private redCallableEvaluate: CallableEvaluate;

    private redCallableGetPropertyValuePointer: CallableGetPropertyValuePointer;

    private redCallableLinkPointers: CallableLinkPointers;

    private redCallableSetPrototypeOf: CallableSetPrototypeOf;

    private redCallableDefineProperties: CallableDefineProperties;

    private redCallableInstallLazyDescriptors: CallableInstallLazyDescriptors;

    private redGlobalThisPointer: Pointer;

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
        this.blueConnector = blueConnector;
        this.redConnector = redConnector;
        let blueHooks: Parameters<HooksCallback>;
        let redHooks: Parameters<HooksCallback>;

        const blueExportsCallback: HooksCallback = (...hooks) => {
            blueHooks = hooks;
        };
        const redExportsCallback: HooksCallback = (...hooks) => {
            redHooks = hooks;
        };
        // prettier-ignore
        const localConnect = blueConnector(
            'blue',
            SHOULD_NOT_TRAP_MUTATION,
            blueExportsCallback,
            {
                distortionCallback,
                instrumentation,
            }
        );
        // prettier-ignore
        const foreignConnect = redConnector(
            'red',
            SHOULD_TRAP_MUTATION,
            redExportsCallback
        );
        ReflectApply(localConnect, undefined, redHooks!);
        ReflectApply(foreignConnect, undefined, blueHooks!);
        const {
            0: blueGlobalThisPointer,
            1: blueGetSelectedTarget,
            2: blueGetTransferableValue,
            3: blueCallableGetPropertyValuePointer,
            // 4: blueCallableEvaluate,
            5: blueCallableLinkPointers,
        } = blueHooks!;
        this.blueGlobalThisPointer = blueGlobalThisPointer;
        this.blueGetSelectedTarget = blueGetSelectedTarget;
        this.blueGetTransferableValue = blueGetTransferableValue;
        this.blueCallableGetPropertyValuePointer = blueCallableGetPropertyValuePointer;
        this.blueCallableLinkPointers = blueCallableLinkPointers;
        const {
            0: redGlobalThisPointer,
            // 1: redGetSelectedTarget,
            // 2: redGetTransferableValue,
            3: redCallableGetPropertyValuePointer,
            4: redCallableEvaluate,
            5: redCallableLinkPointers,
            // 6: redCallablePushTarget,
            // 7: redCallableApply,
            // 8: redCallableConstruct,
            // 9: redCallableDefineProperty,
            // 10: redCallableDeleteProperty,
            // 11: redCallableGet,
            // 12: redCallableGetOwnPropertyDescriptor,
            // 13: redCallableGetPrototypeOf,
            // 14: redCallableHas,
            // 15: redCallableIsExtensible,
            // 16: redCallableOwnKeys,
            // 17: redCallablePreventExtensions,
            // 18: redCallableSet,
            19: redCallableSetPrototypeOf,
            // 20: redCallableDebugInfo,
            21: redCallableDefineProperties,
            // 22: redCallableGetTargetIntegrityTraits,
            // 23: redCallableGetToStringTagOfTarget,
            // 24: redCallableInstallErrorPrepareStackTrace,
            25: redCallableInstallLazyDescriptors,
        } = redHooks!;
        this.redGlobalThisPointer = redGlobalThisPointer;
        this.redCallableGetPropertyValuePointer = redCallableGetPropertyValuePointer;
        this.redCallableEvaluate = redCallableEvaluate;
        this.redCallableLinkPointers = redCallableLinkPointers;
        this.redCallableSetPrototypeOf = redCallableSetPrototypeOf;
        this.redCallableDefineProperties = redCallableDefineProperties;
        this.redCallableInstallLazyDescriptors = redCallableInstallLazyDescriptors;
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

    lazyRemap(
        target: ProxyTarget,
        ownKeys: PropertyKeys,
        unforgeableGlobalThisKeys?: PropertyKeys
    ) {
        const targetPointer = this.blueGetTransferableValue(target) as Pointer;
        const args: Parameters<CallableInstallLazyDescriptors> = [targetPointer];
        ReflectApply(ArrayProtoPush, args, ownKeys);
        if (unforgeableGlobalThisKeys?.length) {
            // Use `LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL` to delimit
            // `ownKeys` and `unforgeableGlobalThisKeys`.
            args[args.length] = LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
            ReflectApply(ArrayProtoPush, args, unforgeableGlobalThisKeys);
        }
        ReflectApply(this.redCallableInstallLazyDescriptors, undefined, args);
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

    remap(target: ProxyTarget, unsafeBlueDescMap: PropertyDescriptorMap) {
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
