import { InstrumentationHooks } from './instrumentation';
import {
    createMembraneMarshall,
    CallableDefineProperty,
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
    SupportFlagsEnum,
} from './membrane';

export interface SupportFlagsObject {
    magicMarker?: boolean;
}

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

const ArrayCtor = Array;
const { includes: ArrayProtoIncludes } = Array.prototype;
const ErrorCtor = Error;
const { assign: ObjectAssign, keys: ObjectKeys } = Object;
const {
    hasOwnProperty: ObjectProtoHasOwnProperty,
    propertyIsEnumerable: ObjectProtoPropertyIsEnumerable,
} = Object.prototype;
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

    private redCallableInstallLazyDescriptors: CallableInstallLazyDescriptors;

    private redCallableDefineProperty: CallableDefineProperty;

    private redCallableLinkPointers: CallableLinkPointers;

    private redCallableGetPropertyValuePointer: CallableGetPropertyValuePointer;

    constructor(options: VirtualEnvironmentOptions) {
        if (options === undefined) {
            throw new ErrorCtor(`Missing VirtualEnvironmentOptions options bag.`);
        }
        const {
            blueConnector,
            redConnector,
            distortionCallback,
            support,
            instrumentation,
        } = options;
        this.blueConnector = blueConnector;
        this.redConnector = redConnector;

        let supportFlags = SupportFlagsEnum.None;
        const supportProps = support ? ObjectKeys(support) : [];
        for (let i = 0, len = supportProps.length; i < len; i += 1) {
            const key = capitalizeFirstChar(supportProps[i]);
            if (ReflectApply(ObjectProtoHasOwnProperty, SupportFlagsEnum, [key])) {
                supportFlags |= SupportFlagsEnum[key];
            }
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
        // prettier-ignore
        const [
            blueGlobalThisPointer,
            blueGetSelectedTarget,
            blueGetTransferableValue,
            blueCallableGetPropertyValuePointer,
            // eslint-disable-next-line comma-style
            , // blueCallableEvaluate
            blueCallableLinkPointers
        ] = blueHooks!;
        this.blueGlobalThisPointer = blueGlobalThisPointer;
        this.blueGetSelectedTarget = blueGetSelectedTarget;
        this.blueGetTransferableValue = blueGetTransferableValue;
        this.blueCallableGetPropertyValuePointer = blueCallableGetPropertyValuePointer;
        this.blueCallableLinkPointers = blueCallableLinkPointers;
        // prettier-ignore
        const [
            redGlobalThisPointer,
            , // redGetSelectedTarget
            // eslint-disable-next-line comma-style
            , // redGetTransferableValue
            redCallableGetPropertyValuePointer,
            redCallableEvaluate,
            redCallableLinkPointers,
            redCallableInstallLazyDescriptors,
            , // redCallablePushTarget
            , // redCallableApply
            // eslint-disable-next-line comma-style
            , // redCallableConstruct
            redCallableDefineProperty,
            , // redCallableDeleteProperty
            , // redCallableGetOwnPropertyDescriptor
            , // redCallableGetPrototypeOf
            , // redCallableHas
            , // redCallableIsExtensible
            , // redCallableOwnKeys
            // eslint-disable-next-line comma-style
            , // redCallablePreventExtensions
            redCallableSetPrototypeOf,
        ] = redHooks!;
        this.redGlobalThisPointer = redGlobalThisPointer;
        this.redCallableEvaluate = redCallableEvaluate;
        this.redCallableInstallLazyDescriptors = redCallableInstallLazyDescriptors;
        this.redCallableSetPrototypeOf = redCallableSetPrototypeOf;
        this.redCallableDefineProperty = redCallableDefineProperty;
        this.redCallableGetPropertyValuePointer = redCallableGetPropertyValuePointer;
        this.redCallableLinkPointers = redCallableLinkPointers;
    }

    evaluate(sourceText: string): any {
        try {
            const pointerOrPrimitiveValue = this.redCallableEvaluate(sourceText);
            if (typeof pointerOrPrimitiveValue === 'function') {
                pointerOrPrimitiveValue();
                return this.blueGetSelectedTarget();
            }
            return pointerOrPrimitiveValue;
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
        for (let i = 0, len = keys.length; i < len; i += 1) {
            const key = keys[i];
            bluePointer = this.blueCallableGetPropertyValuePointer(bluePointer, key);
            redPointer = this.redCallableGetPropertyValuePointer(redPointer, key);
        }
        this.redCallableLinkPointers(redPointer, bluePointer);
        this.blueCallableLinkPointers(bluePointer, redPointer);
    }

    remap(target: ProxyTarget, blueDescriptors: PropertyDescriptorMap) {
        const keys = ReflectOwnKeys(blueDescriptors) as (string | symbol)[];
        const targetPointer = this.blueGetTransferableValue(target) as Pointer;
        // prettier-ignore
        for (let i = 0, len = keys.length; i < len; i += 1) {
            const key = keys[i];
            const unsafeBlueDesc = (blueDescriptors as any)[key];
            // Avoid poisoning by only installing own properties from blueDescriptors
            // eslint-disable-next-line prefer-object-spread
            const safeBlueDesc = ObjectAssign({ __proto__: null }, unsafeBlueDesc);
            // Install descriptor into the red side.
            this.redCallableDefineProperty(
                targetPointer,
                key,
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

    lazyRemap(target: ProxyTarget, keys: (string | symbol)[]) {
        const { length: keysLen } = keys;
        const keyAndEnumTupleLen = keysLen * 2;
        // Expand args to length of the oPointer plus key and enumerable tuple.
        const args = new ArrayCtor(
            1 + keyAndEnumTupleLen
        ) as Parameters<CallableInstallLazyDescriptors>;
        const enumerableKeys = ObjectKeys(target); // except symbols
        const targetPointer = this.blueGetTransferableValue(target) as Pointer;
        args[0] = targetPointer;
        let argsIndex = 0;
        for (let i = 0; i < keysLen; i += 1) {
            const key = keys[i];
            const isEnumerable: boolean =
                typeof key === 'symbol'
                    ? ReflectApply(ObjectProtoPropertyIsEnumerable, target, [key])
                    : ReflectApply(ArrayProtoIncludes, enumerableKeys, [key]);
            // Add to key and enumerable tuple.
            args[(argsIndex += 1)] = key;
            args[(argsIndex += 1)] = isEnumerable;
        }
        ReflectApply(this.redCallableInstallLazyDescriptors, undefined, args);
    }

    remapProto(target: ProxyTarget, proto: object | null) {
        const targetPointer = this.blueGetTransferableValue(target) as Pointer;
        const pointerOrNull = this.blueGetTransferableValue(proto) as Pointer | null;
        this.redCallableSetPrototypeOf(targetPointer, pointerOrNull);
    }
}
