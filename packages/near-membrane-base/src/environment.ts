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
} from './membrane';

const frameGlobalNamesRegExp = /^\d+$/;

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
const { propertyIsEnumerable: ObjectPropertyIsEnumerable } = Object;
const { apply: ReflectApply, ownKeys: ReflectOwnKeys } = Reflect;

function RegExpTest(regexp: RegExp, str: string): boolean {
    return ReflectApply(RegExpProtoTest, regexp, [str]);
}

const { hasOwnProperty: ObjectHasOwnProperty } = Object.prototype as any;

export class VirtualEnvironment {
    private blueGetTransferableValue: GetTransferableValue;

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
        localConnect(...redHooks!);
        foreignConnect(...blueHooks!);

        const [blueGetTransferableValue] = redHooks!;
        this.blueGetTransferableValue = blueGetTransferableValue;
        // prettier-ignore
        const [,
            redCallableEvaluate,
            redCallableInstallLazyDescriptors,,,,
            redCallableDefineProperty,,,,,,,
            redCallableSetPrototypeOf
        ] = redHooks!;
        this.redCallableEvaluate = redCallableEvaluate;
        this.redCallableInstallLazyDescriptors = redCallableInstallLazyDescriptors;
        this.redCallableSetPrototypeOf = redCallableSetPrototypeOf;
        this.redCallableDefineProperty = redCallableDefineProperty;
    }

    evaluate(sourceText: string): void {
        this.redCallableEvaluate(sourceText);
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
            const configurable = ObjectHasOwnProperty.call(blueDescriptor, 'configurable')
                ? !!blueDescriptor.configurable
                : undefinedSymbol;
            const enumerable = ObjectHasOwnProperty.call(blueDescriptor, 'enumerable')
                ? !!blueDescriptor.enumerable
                : undefinedSymbol;
            const writable = ObjectHasOwnProperty.call(blueDescriptor, 'writable')
                ? !!blueDescriptor.writable
                : undefinedSymbol;
            const valuePointer = ObjectHasOwnProperty.call(blueDescriptor, 'value')
                ? this.blueGetTransferableValue(blueDescriptor.value)
                : undefinedSymbol;
            const getPointer = ObjectHasOwnProperty.call(blueDescriptor, 'get')
                ? this.blueGetTransferableValue(blueDescriptor.get)
                : undefinedSymbol;
            const setPointer = ObjectHasOwnProperty.call(blueDescriptor, 'set')
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
        const enumerablePropertyKeys = Object.keys(o); // except symbols
        const keysTuple: (PropertyKey | boolean)[] = [];
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
                isEnumerable = enumerablePropertyKeys.includes(key as string);
            }
            keysTuple.push(key, isEnumerable);
        }
        const oPointer = this.blueGetTransferableValue(o) as Pointer;
        this.redCallableInstallLazyDescriptors(oPointer, ...(keysTuple as any));
    }

    remapProto(o: ProxyTarget, proto: object) {
        const oPointer = this.blueGetTransferableValue(o) as Pointer;
        const protoValueOrPointer = this.blueGetTransferableValue(proto);
        this.redCallableSetPrototypeOf(oPointer, protoValueOrPointer);
    }
}
