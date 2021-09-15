import {
    MembraneInit,
    CallableEvaluate,
    CallableInstallLazyDescriptors,
    GetTransferableValue,
    HooksCallback,
    CallableSetPrototypeOf,
    Pointer,
    CallableDefineProperty,
    ProxyTarget,
    GetSelectedTarget,
} from './membrane';

const frameGlobalNamesRegExp = /^\d+$/;

interface VirtualEnvironmentOptions {
    // Blue connector factory
    blueConnector: MembraneInit;
    // Red connector factory
    redConnector: MembraneInit;
    // Optional distortion callback to tame functionalities observed through the membrane
    distortionCallback?: (originalTarget: ProxyTarget) => ProxyTarget;
}

const undefinedSymbol = Symbol('membrane@undefined');
const { test: RegExpProtoTest } = RegExp.prototype;
const ErrorCtor = Error;
const { propertyIsEnumerable: ObjectPropertyIsEnumerable, keys: ObjectKeys } = Object;
const { apply: ReflectApply, ownKeys: ReflectOwnKeys } = Reflect;
const { includes: ArrayIncludes, push: ArrayPush } = Array.prototype;

function RegExpTest(regexp: RegExp, str: string): boolean {
    return ReflectApply(RegExpProtoTest, regexp, [str]);
}

export class VirtualEnvironment {
    private blueGetTransferableValue: GetTransferableValue;

    private blueGetSelectedTarget: GetSelectedTarget;

    private redCallableSetPrototypeOf: CallableSetPrototypeOf;

    private redCallableEvaluate: CallableEvaluate;

    private redCallableInstallLazyDescriptors: CallableInstallLazyDescriptors;

    private redCallableDefineProperty: CallableDefineProperty;

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

        const localConnect = localInit(
            undefinedSymbol,
            'blue',
            false,
            blueExportsCallback,
            distortionCallback
        );
        const foreignConnect = foreignInit(undefinedSymbol, 'red', true, redExportsCallback);
        ReflectApply(localConnect, undefined, redHooks!);
        ReflectApply(foreignConnect, undefined, blueHooks!);

        const [blueGetSelectedTarget, blueGetTransferableValue] = blueHooks!;
        this.blueGetSelectedTarget = blueGetSelectedTarget;
        this.blueGetTransferableValue = blueGetTransferableValue;
        // prettier-ignore
        const [
            , // redGetSelectedTarget
            // eslint-disable-next-line comma-style
            , // redGetTransferableValue
            redCallableEvaluate,
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
            redCallableSetPrototypeOf
        ] = redHooks!;
        this.redCallableEvaluate = redCallableEvaluate;
        this.redCallableInstallLazyDescriptors = redCallableInstallLazyDescriptors;
        this.redCallableSetPrototypeOf = redCallableSetPrototypeOf;
        this.redCallableDefineProperty = redCallableDefineProperty;
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
            // @ts-ignore
            const blueDescriptor = { __proto__: null, ...blueDescriptors[key] };
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
            let isEnumerable = true;
            if (typeof key === 'symbol') {
                if (ObjectPropertyIsEnumerable.call(o, key)) {
                    isEnumerable = true;
                }
            }
            // Skip index keys for magical descriptors of frames on the window proxy.
            // TODO: this applies to all objects rather than just `window`, it might
            // be a problem.
            else if (RegExpTest(frameGlobalNamesRegExp, key as string)) {
                // eslint-disable-next-line no-continue
                continue;
            } else {
                isEnumerable = ArrayIncludes.call(enumerablePropertyKeys, key);
            }
            ArrayPush.call(args, key, isEnumerable);
        }
        ReflectApply(this.redCallableInstallLazyDescriptors, undefined, args);
    }

    remapProto(o: ProxyTarget, proto: object) {
        const oPointer = this.blueGetTransferableValue(o) as Pointer;
        const protoValueOrPointer = this.blueGetTransferableValue(proto);
        this.redCallableSetPrototypeOf(oPointer, protoValueOrPointer);
    }
}
