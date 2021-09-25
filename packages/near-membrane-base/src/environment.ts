import {
    init,
    CallableEvaluate,
    CallableInstallLazyDescriptors,
    GetTransferableValue,
    HooksCallback,
    CallableSetPrototypeOf,
    Pointer,
    CallableDefineProperty,
    ProxyTarget,
    GetSelectedTarget,
    CallableLinkPointers,
    CallableGetPropertyValuePointer,
} from './membrane';

const frameGlobalNamesRegExp = /^\d+$/;
const ShouldTrapMutation = true;
const ShouldNotTrapMutation = false;

interface VirtualEnvironmentOptions {
    // Blue connector factory
    blueConnector: typeof init;
    // Red connector factory
    redConnector: typeof init;
    // Optional distortion callback to tame functionalities observed through the membrane
    distortionCallback?: (originalTarget: ProxyTarget) => ProxyTarget;
}

const undefinedSymbol = Symbol('membrane@undefined');
const { test: RegExpProtoTest } = RegExp.prototype;
const ErrorCtor = Error;
const { assign: ObjectAssign, keys: ObjectKeys } = Object;
const { propertyIsEnumerable: ObjectProtoPropertyIsEnumerable } = Object.prototype;
const { apply: ReflectApply, ownKeys: ReflectOwnKeys } = Reflect;
const { includes: ArrayProtoIncludes, push: ArrayProtoPush } = Array.prototype;

function RegExpTest(regexp: RegExp, str: string): boolean {
    return ReflectApply(RegExpProtoTest, regexp, [str]);
}

export class VirtualEnvironment {
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
        const { blueConnector: localInit, redConnector: foreignInit, distortionCallback } = options;

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
        };

        const localConnect = localInit(
            undefinedSymbol,
            'blue',
            ShouldNotTrapMutation,
            blueExportsCallback,
            initLocalOptions
        );
        const foreignConnect = foreignInit(
            undefinedSymbol,
            'red',
            ShouldTrapMutation,
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
            ,
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

    evaluate(sourceText: string): void {
        try {
            this.redCallableEvaluate(sourceText);
        } catch (e) {
            const pushedError = this.blueGetSelectedTarget();
            if (pushedError) {
                throw pushedError;
            }
            throw e;
        }
    }

    link(...keys: PropertyKey[]) {
        let bluePointer = this.blueGlobalThisPointer;
        let redPointer = this.redGlobalThisPointer;
        for (let i = 0, len = keys.length; i < len; i += 1) {
            bluePointer = this.blueCallableGetPropertyValuePointer(bluePointer, keys[i]);
            redPointer = this.redCallableGetPropertyValuePointer(redPointer, keys[i]);
        }
        this.redCallableLinkPointers(redPointer, bluePointer);
        this.blueCallableLinkPointers(bluePointer, redPointer);
    }

    remap(o: ProxyTarget, blueDescriptors: PropertyDescriptorMap) {
        const keys = ReflectOwnKeys(blueDescriptors);
        const oPointer = this.blueGetTransferableValue(o) as Pointer;
        for (let i = 0, len = keys.length; i < len; i += 1) {
            const key = keys[i];
            // Skip index keys for magical descriptors of frames on the window proxy.
            if (typeof key !== 'symbol' && RegExpTest(frameGlobalNamesRegExp, key as string)) {
                // eslint-disable-next-line no-continue
                continue;
            }
            // Avoid poisoning by only installing own properties from blueDescriptors
            // eslint-disable-next-line prefer-object-spread
            const blueDescriptor = ObjectAssign({ __proto__: null }, (blueDescriptors as any)[key]);
            const configurable =
                'configurable' in blueDescriptor ? !!blueDescriptor.configurable : undefinedSymbol;
            const enumerable =
                'enumerable' in blueDescriptor ? !!blueDescriptor.enumerable : undefinedSymbol;
            const writable =
                'writable' in blueDescriptor ? !!blueDescriptor.writable : undefinedSymbol;
            const valuePointer =
                'value' in blueDescriptor
                    ? this.blueGetTransferableValue(blueDescriptor.value)
                    : undefinedSymbol;
            const getPointer =
                'get' in blueDescriptor
                    ? this.blueGetTransferableValue(blueDescriptor.get)
                    : undefinedSymbol;
            const setPointer =
                'set' in blueDescriptor
                    ? this.blueGetTransferableValue(blueDescriptor.set)
                    : undefinedSymbol;
            // installing descriptor into the red side
            this.redCallableDefineProperty(
                oPointer,
                key,
                configurable,
                enumerable,
                writable,
                valuePointer,
                getPointer,
                setPointer
            );
        }
    }

    lazyRemap(o: ProxyTarget, keys: PropertyKey[]) {
        const enumerablePropertyKeys = ObjectKeys(o); // except symbols
        const oPointer = this.blueGetTransferableValue(o) as Pointer;
        const args: Parameters<CallableInstallLazyDescriptors> = [oPointer];
        for (let i = 0, len = keys.length; i < len; i += 1) {
            const key = keys[i];
            // Skip index keys for magical descriptors of frames on the window proxy.
            // TODO: this applies to all objects rather than just `window`, it might
            // be a problem.
            if (typeof key !== 'symbol' && RegExpTest(frameGlobalNamesRegExp, key as string)) {
                // eslint-disable-next-line no-continue
                continue;
            }
            const isEnumerable =
                typeof key === 'symbol'
                    ? ReflectApply(ObjectProtoPropertyIsEnumerable, o, [key])
                    : ReflectApply(ArrayProtoIncludes, enumerablePropertyKeys, [key]);

            ReflectApply(ArrayProtoPush, args, [key, isEnumerable]);
        }
        ReflectApply(this.redCallableInstallLazyDescriptors, undefined, args);
    }

    remapProto(o: ProxyTarget, proto: object) {
        const oPointer = this.blueGetTransferableValue(o) as Pointer;
        const protoValueOrPointer = this.blueGetTransferableValue(proto);
        this.redCallableSetPrototypeOf(oPointer, protoValueOrPointer);
    }
}
