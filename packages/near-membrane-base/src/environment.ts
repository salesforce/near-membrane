import { InstrumentationHooks } from './instrumentation';
import {
    createMembraneMarshall,
    CallableDefineProperty,
    CallableEvaluate,
    CallableGetPropertyValuePointer,
    CallableLinkPointers,
    CallableSetPrototypeOf,
    DistortionCallback,
    GetSelectedTarget,
    GetTransferableValue,
    HooksCallback,
    Pointer,
    ProxyTarget,
    SupportFlagsEnum,
} from './membrane';

export interface SupportFlagsObject {}

interface VirtualEnvironmentOptions {
    // Blue connector factory
    blueConnector: ReturnType<typeof createMembraneMarshall>;
    // Optional distortion callback to tame functionalities observed through the membrane
    distortionCallback?: DistortionCallback;
    // Red connector factory
    redConnector: ReturnType<typeof createMembraneMarshall>;
    // Environment support object
    support?: SupportFlagsObject;
    // Instrumentation libray object
    instrumentation?: InstrumentationHooks;
}

const SHOULD_TRAP_MUTATION = true;
const SHOULD_NOT_TRAP_MUTATION = false;
const UNDEFINED_SYMBOL = Symbol.for('@@membraneUndefinedValue');

const ErrorCtor = Error;
const { assign: ObjectAssign, keys: ObjectKeys } = Object;
const { apply: ReflectApply, ownKeys: ReflectOwnKeys } = Reflect;
const { slice: StringProtoSlice, toUpperCase: StringProtoToUpperCase } = String.prototype;

function capitalizeFirstChar(string: string): string {
    const { length } = string;
    if (!length) {
        return string;
    }
    const upper = ReflectApply(StringProtoToUpperCase, string[0], []);
    return length === 1 ? upper : upper + ReflectApply(StringProtoSlice, string, [1]);
}

export class VirtualEnvironment {
    public blueConnector: ReturnType<typeof createMembraneMarshall>;

    public redConnector: ReturnType<typeof createMembraneMarshall>;

    private blueGlobalThisPointer: Pointer;

    private blueGetTransferableValue: GetTransferableValue;

    private blueCallableLinkPointers: CallableLinkPointers;

    private blueGetSelectedTarget: GetSelectedTarget;

    private blueCallableGetPropertyValuePointer: CallableGetPropertyValuePointer;

    private redGlobalThisPointer: Pointer;

    private redCallableSetPrototypeOf: CallableSetPrototypeOf;

    private redCallableEvaluate: CallableEvaluate;

    private redCallableDefineProperty: CallableDefineProperty;

    private redCallableLinkPointers: CallableLinkPointers;

    private redCallableGetPropertyValuePointer: CallableGetPropertyValuePointer;

    constructor(options: VirtualEnvironmentOptions) {
        if (options === undefined) {
            throw new ErrorCtor('Missing VirtualEnvironmentOptions options bag.');
        }
        const { blueConnector, redConnector, distortionCallback, support, instrumentation } =
            options;
        this.blueConnector = blueConnector;
        this.redConnector = redConnector;

        let supportFlags = SupportFlagsEnum.None;
        const supportKeys = support ? ObjectKeys(support) : [];
        for (let i = 0, { length } = supportKeys; i < length; i += 1) {
            const enumKey = capitalizeFirstChar(supportKeys[i]);
            supportFlags |= SupportFlagsEnum[enumKey];
        }

        let blueHooks: Parameters<HooksCallback>;
        let redHooks: Parameters<HooksCallback>;

        const blueExportsCallback: HooksCallback = (...hooks) => {
            blueHooks = hooks;
        };
        const redExportsCallback: HooksCallback = (...hooks) => {
            redHooks = hooks;
        };

        const initLocalOptions = {
            distortionCallback,
            instrumentation,
        };

        const localConnect = blueConnector(
            'blue',
            SHOULD_NOT_TRAP_MUTATION,
            supportFlags,
            blueExportsCallback,
            initLocalOptions
        );
        const foreignConnect = redConnector(
            'red',
            SHOULD_TRAP_MUTATION,
            supportFlags,
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
            9: redCallableDefineProperty,
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
        } = redHooks!;
        this.redGlobalThisPointer = redGlobalThisPointer;
        this.redCallableEvaluate = redCallableEvaluate;
        this.redCallableSetPrototypeOf = redCallableSetPrototypeOf;
        this.redCallableDefineProperty = redCallableDefineProperty;
        this.redCallableGetPropertyValuePointer = redCallableGetPropertyValuePointer;
        this.redCallableLinkPointers = redCallableLinkPointers;
    }

    evaluate(sourceText: string): any {
        try {
            const bluePointerOrPrimitiveValue = this.redCallableEvaluate(sourceText);
            if (typeof bluePointerOrPrimitiveValue === 'function') {
                bluePointerOrPrimitiveValue();
                return this.blueGetSelectedTarget();
            }
            return bluePointerOrPrimitiveValue;
        } catch (e: any) {
            const pushedError = this.blueGetSelectedTarget();
            if (pushedError) {
                throw pushedError;
            }
            throw e;
        }
    }

    link(...keys: (string | symbol)[]) {
        let bluePointer = this.blueGlobalThisPointer;
        let redPointer = this.redGlobalThisPointer;
        for (let i = 0, { length } = keys; i < length; i += 1) {
            const key = keys[i];
            bluePointer = this.blueCallableGetPropertyValuePointer(bluePointer, key);
            redPointer = this.redCallableGetPropertyValuePointer(redPointer, key);
        }
        this.redCallableLinkPointers(redPointer, bluePointer);
        this.blueCallableLinkPointers(bluePointer, redPointer);
    }

    remap(target: ProxyTarget, unsafeBlueDescMap: PropertyDescriptorMap) {
        const ownKeys = ReflectOwnKeys(unsafeBlueDescMap);
        const targetPointer = this.blueGetTransferableValue(target) as Pointer;
        // prettier-ignore
        for (let i = 0, { length } = ownKeys; i < length; i += 1) {
            const ownKey = ownKeys[i];
            const unsafeBlueDesc = (unsafeBlueDescMap as any)[ownKey];
            // Avoid poisoning by only installing own properties from unsafeBlueDescMap.
            // We don't use a toSafeDescriptor() style helper since that mutates
            // the unsafeBlueDesc.
            // eslint-disable-next-line prefer-object-spread
            const safeBlueDesc = ObjectAssign({ __proto__: null }, unsafeBlueDesc);
            // Install descriptor into the red side.
            this.redCallableDefineProperty(
                targetPointer,
                ownKey,
                'configurable' in safeBlueDesc
                    ? !!safeBlueDesc.configurable
                    : UNDEFINED_SYMBOL,
                'enumerable' in safeBlueDesc
                    ? !!safeBlueDesc.enumerable
                    : UNDEFINED_SYMBOL,
                'writable' in safeBlueDesc
                    ? !!safeBlueDesc.writable
                    : UNDEFINED_SYMBOL,
                'value' in safeBlueDesc
                    ? this.blueGetTransferableValue(safeBlueDesc.value)
                    : UNDEFINED_SYMBOL,
                'get' in safeBlueDesc
                    ? this.blueGetTransferableValue(safeBlueDesc.get) as Pointer
                    : UNDEFINED_SYMBOL,
                'set' in safeBlueDesc
                    ? this.blueGetTransferableValue(safeBlueDesc.set) as Pointer
                    : UNDEFINED_SYMBOL
            );
        }
    }

    remapProto(target: ProxyTarget, proto: object | null) {
        const foreignTargetPointer = this.blueGetTransferableValue(target) as Pointer;
        const transferableProto = proto ? (this.blueGetTransferableValue(proto) as Pointer) : proto;
        this.redCallableSetPrototypeOf(foreignTargetPointer, transferableProto);
    }
}
