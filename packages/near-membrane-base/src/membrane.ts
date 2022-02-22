/**
 * This file contains an exportable (portable) function `init` used to initialize
 * one side of a membrane on any realm. The only prerequisite is the ability to
 * evaluate the sourceText of the `init` function there. Once evaluated, the
 * function will return a set of values that can be used to wire up the side of
 * the membrane with another existing `init` function from another realm, in which
 * case they will exchange callable functions that are required to connect the
 * two realms via the membrane.
 *
 * About the mechanics of the membrane, there are few important considerations:
 *
 * 1. Pointers are the way to pass reference to object and functions.
 * 2. A dedicated symbol (LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL) is needed
 *    to represent the absence of a value.
 * 3. The realm that owns the object or function is responsible for projecting
 *    the proxy onto the other side (via callablePushTarget), which returns a
 *    Pointer that can be used by the realm to pass the reference to the same
 *    proxy over and over again.
 * 4. The realm that owns the proxy (after the other side projects it into it)
 *    will hold a Pointer alongside the proxy to signal what original object or
 *    function should the foreign operation operates, it is always the first
 *    argument of the foreign callable for proxies, and the other side can use
 *    it via `getSelectedTarget`.
 */

import { InstrumentationHooks } from './instrumentation';

const { setPrototypeOf: ReflectSetPrototypeOf } = Reflect;

type CallablePushTarget = (
    pointer: () => void,
    targetTraits: number,
    targetFunctionName: string | undefined
) => Pointer;
type CallableApply = (
    targetPointer: Pointer,
    thisArgPointerOrPrimitive: PointerOrPrimitive,
    ...listOfPointersOrPrimitives: PointerOrPrimitive[]
) => PointerOrPrimitive;
type CallableConstruct = (
    targetPointer: Pointer,
    newTargetPointer: PointerOrPrimitive,
    ...listOfPointersOrPrimitives: PointerOrPrimitive[]
) => PointerOrPrimitive;
type CallableDeleteProperty = (targetPointer: Pointer, key: string | symbol) => boolean;
type CallableGetOwnPropertyDescriptor = (
    targetPointer: Pointer,
    key: string | symbol,
    foreignCallableDescriptorCallback: CallableDescriptorCallback
) => void;
type CallableGetPrototypeOf = (targetPointer: Pointer) => PointerOrPrimitive;
type CallableHas = (targetPointer: Pointer, key: string | symbol) => boolean;
type CallableIsExtensible = (targetPointer: Pointer) => boolean;
type CallableOwnKeys = (
    targetPointer: Pointer,
    foreignCallableKeysCallback: (...args: ReturnType<typeof Reflect.ownKeys>) => void
) => void;
type CallablePreventExtensions = (targetPointer: Pointer) => number;
type CallableSet = (
    targetPointer: Pointer,
    key: string | symbol,
    value: any,
    receiver: PointerOrPrimitive
) => boolean;
type CallableGetSerializedValueOfTarget = (targetPointer: Pointer) => SerializedValue | undefined;
type CallableGetTargetIntegrityTraits = (targetPointer: Pointer) => number;
type CallableGetToStringTagOfTarget = (targetPointer: Pointer) => string;
type CallableIsTargetLive = (targetPointer: Pointer) => boolean;
type CallableIsTargetRevoked = (targetPointer: Pointer) => boolean;
type CallableWarn = (...args: Parameters<typeof console.warn>) => void;
type CallableBatchGetAndHasToStringSymbolTag = (
    targetPointer: Pointer,
    targetTraits: number,
    key: string | symbol,
    receiver: PointerOrPrimitive
) => PointerOrPrimitive;
type CallableBatchGetPrototypeOfAndOwnPropertyDescriptors = (
    targetPointer: Pointer,
    foreignCallableDescriptorsCallback: CallableDescriptorsCallback
) => PointerOrPrimitive;
type CallableBatchGetPrototypeOfWhenHasNoOwnProperty = (
    targetPointer: Pointer,
    key: string | symbol
) => PointerOrPrimitive;
type CallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor = (
    targetPointer: Pointer,
    key: string | symbol,
    foreignCallableDescriptorCallback: CallableDescriptorCallback
) => PointerOrPrimitive;
type CallableDescriptorCallback = (
    configurable: boolean | symbol,
    enumerable: boolean | symbol,
    writable: boolean | symbol,
    valuePointer: PointerOrPrimitive,
    getPointer: PointerOrPrimitive,
    setPointer: PointerOrPrimitive
) => void;
type CallableDescriptorsCallback = (
    ...descriptorTuples: [string | symbol, ...Parameters<CallableDescriptorCallback>]
) => void;
type CallableNonConfigurableDescriptorCallback = CallableDescriptorCallback;
type Primitive = bigint | boolean | null | number | string | symbol | undefined;
type PointerOrPrimitive = Pointer | Primitive;
type SerializedValue = bigint | boolean | number | string | symbol;
type ShadowTarget = ProxyTarget;
export type CallableDefineProperty = (
    targetPointer: Pointer,
    key: string | symbol,
    configurable: boolean | symbol,
    enumerable: boolean | symbol,
    writable: boolean | symbol,
    valuePointer: PointerOrPrimitive,
    getPointer: PointerOrPrimitive,
    setPointer: PointerOrPrimitive,
    foreignCallableNonConfigurableDescriptorCallback?: CallableNonConfigurableDescriptorCallback
) => boolean;
export type CallableEvaluate = (sourceText: string) => PointerOrPrimitive;
export type CallableGetPropertyValuePointer = (
    targetPointer: Pointer,
    key: string | symbol
) => Pointer;
export type CallableLinkPointers = (targetPointer: Pointer, foreignTargetPointer: Pointer) => void;
export type CallableSetPrototypeOf = (
    targetPointer: Pointer,
    protoPointerOrNull: Pointer | null
) => boolean;
export type DistortionCallback = (target: ProxyTarget) => ProxyTarget;
export type GetSelectedTarget = () => any;
export type GetTransferableValue = (value: any) => PointerOrPrimitive;
export type HooksCallback = (
    globalThisPointer: Pointer,
    getSelectedTarget: GetSelectedTarget,
    getTransferableValue: GetTransferableValue,
    callableGetPropertyValuePointer: CallableGetPropertyValuePointer,
    callableEvaluate: CallableEvaluate,
    callableLinkPointers: CallableLinkPointers,
    callablePushTarget: CallablePushTarget,
    callableApply: CallableApply,
    callableConstruct: CallableConstruct,
    callableDefineProperty: CallableDefineProperty,
    callableDeleteProperty: CallableDeleteProperty,
    callableGetOwnPropertyDescriptor: CallableGetOwnPropertyDescriptor,
    callableGetPrototypeOf: CallableGetPrototypeOf,
    callableHas: CallableHas,
    callableIsExtensible: CallableIsExtensible,
    callableOwnKeys: CallableOwnKeys,
    callablePreventExtensions: CallablePreventExtensions,
    callableSet: CallableSet,
    callableSetPrototypeOf: CallableSetPrototypeOf,
    callableGetSerializedValueOfTarget: CallableGetSerializedValueOfTarget,
    callableGetTargetIntegrityTraits: CallableGetTargetIntegrityTraits,
    callableGetToStringTagOfTarget: CallableGetToStringTagOfTarget,
    callableIsTargetLive: CallableIsTargetLive,
    callableIsTargetRevoked: CallableIsTargetRevoked,
    callableWarn: CallableWarn,
    callableBatchGetAndHasToStringSymbolTag: CallableBatchGetAndHasToStringSymbolTag,
    callableBatchGetPrototypeOfAndOwnPropertyDescriptors: CallableBatchGetPrototypeOfAndOwnPropertyDescriptors,
    callableBatchGetPrototypeOfWhenHasNoOwnProperty: CallableBatchGetPrototypeOfWhenHasNoOwnProperty,
    callableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor: CallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor
) => void;
export interface InitLocalOptions {
    distortionCallback?: DistortionCallback;
    instrumentation?: InstrumentationHooks;
}
export type Pointer = CallableFunction;
export type ProxyTarget = CallableFunction | any[] | object;
// eslint-disable-next-line no-shadow
export enum SupportFlagsEnum {
    None = 0,
}
ReflectSetPrototypeOf(SupportFlagsEnum, null);

// istanbul ignore next
export function createMembraneMarshall() {
    // This package is bundled by third-parties that have their own build time
    // replacement logic. Instead of customizing each build system to be aware
    // of this package we perform a small runtime check to determine whether our
    // code is minified or in DEBUG_MODE.
    // https://developer.salesforce.com/docs/component-library/documentation/en/lwc/lwc.debug_mode_enable
    const DEBUG_MODE = `${() => /**/ 1}`.includes('*');
    const FLAGS_REG_EXP = /\w*$/;
    const LOCKER_LIVE_VALUE_MARKER_SYMBOL = Symbol.for('@@lockerLiveValue');
    const LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL = Symbol.for(
        '@@lockerNearMembraneSerializedValue'
    );
    const LOCKER_NEAR_MEMBRANE_SYMBOL = Symbol.for('@@lockerNearMembrane');
    const LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL = Symbol.for(
        '@@lockerNearMembraneUndefinedValue'
    );
    // BigInt is not supported in Safari 13.1.
    // https://caniuse.com/bigint
    const SUPPORTS_BIG_INT = typeof BigInt === 'function';
    const { toStringTag: TO_STRING_TAG_SYMBOL } = Symbol;

    const ArrayCtor = Array;
    const ObjectCtor = Object;
    const RegExpProto = RegExp.prototype;
    const TypeErrorCtor = TypeError;
    const { isArray: isArrayOrThrowForRevoked } = ArrayCtor;
    const { isView: ArrayBufferIsView } = ArrayBuffer;
    const BigIntProtoValueOf = SUPPORTS_BIG_INT ? BigInt.prototype.valueOf : undefined;
    const { valueOf: BooleanProtoValueOf } = Boolean.prototype;
    const { stringify: JSONStringify } = JSON;
    const {
        defineProperties: ObjectDefineProperties,
        freeze: ObjectFreeze,
        getOwnPropertyDescriptors: ObjectGetOwnPropertyDescriptors,
        isFrozen: ObjectIsFrozen,
        isSealed: ObjectIsSealed,
        prototype: ObjectProto,
        seal: ObjectSeal,
    } = ObjectCtor;
    const {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        __defineGetter__: ObjectProto__defineGetter__,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        __lookupGetter__: ObjectProto__lookupGetter__,
        hasOwnProperty: ObjectProtoHasOwnProperty,
        toString: ObjectProtoToString,
    } = ObjectProto as any;
    const { valueOf: NumberProtoValueOf } = Number.prototype;
    const { revocable: ProxyRevocable } = Proxy;
    const {
        apply: ReflectApply,
        construct: ReflectConstruct,
        defineProperty: ReflectDefineProperty,
        deleteProperty: ReflectDeleteProperty,
        get: ReflectGet,
        getOwnPropertyDescriptor: ReflectGetOwnPropertyDescriptor,
        getPrototypeOf: ReflectGetPrototypeOf,
        has: ReflectHas,
        isExtensible: ReflectIsExtensible,
        ownKeys: ReflectOwnKeys,
        preventExtensions: ReflectPreventExtensions,
        set: ReflectSet,
        // eslint-disable-next-line @typescript-eslint/no-shadow, no-shadow
        setPrototypeOf: ReflectSetPrototypeOf,
    } = Reflect;
    const { exec: RegExpProtoExec, toString: RegExProtoToString } = RegExpProto;
    // Edge 15 does not support RegExp.prototype.flags.
    // https://caniuse.com/mdn-javascript_builtins_regexp_flags
    const RegExpProtoFlagsGetter =
        ReflectApply(ObjectProto__lookupGetter__, RegExpProto, ['flags']) ||
        function flags(this: RegExp) {
            const string = ReflectApply(RegExProtoToString, this, []);
            return ReflectApply(RegExpProtoExec, FLAGS_REG_EXP, [string])[0];
        };
    const RegExpProtoSourceGetter = ReflectApply(ObjectProto__lookupGetter__, RegExpProto, [
        'source',
    ])!;
    const { slice: StringProtoSlice, valueOf: StringProtoValueOf } = String.prototype;
    const { valueOf: SymbolProtoValueOf } = Symbol.prototype;
    const { get: WeakMapProtoGet, set: WeakMapProtoSet } = WeakMap.prototype;
    const consoleRef = console;
    const { warn: consoleWarnRef } = consoleRef;
    const localEval = eval;
    const globalThisRef =
        (typeof globalThis !== 'undefined' && globalThis) ||
        // This is for environments like Android emulators running Chrome 69.
        // eslint-disable-next-line no-restricted-globals
        (typeof self !== 'undefined' && self) ||
        // See https://mathiasbynens.be/notes/globalthis for more details.
        (ReflectDefineProperty(Object.prototype, 'globalThis', {
            // @ts-ignore: TS doesn't like __proto__ on property descriptors.
            __proto__: null,
            configurable: true,
            get() {
                ReflectDeleteProperty(Object.prototype, 'globalThis');
                // Safari 12 on iOS 12.1 has a `this` of `undefined` so we
                // fallback to `self`.
                // eslint-disable-next-line no-restricted-globals
                return this || self;
            },
        }),
        globalThis);
    // eslint-disable-next-line no-shadow
    const enum PreventExtensionsResult {
        None = 0,
        Extensible = 1 << 0,
        False = 1 << 1,
        True = 1 << 2,
    }
    // eslint-disable-next-line no-shadow
    const enum ProxyHandlerTraps {
        None = 0,
        Apply = 1 << 0,
        Construct = 1 << 1,
        DefineProperty = 1 << 2,
        DeleteProperty = 1 << 3,
        Get = 1 << 4,
        GetOwnPropertyDescriptor = 1 << 5,
        GetPrototypeOf = 1 << 6,
        Has = 1 << 7,
        IsExtensible = 1 << 8,
        OwnKeys = 1 << 9,
        PreventExtensions = 1 << 10,
        Set = 1 << 11,
        SetPrototypeOf = 1 << 12,
    }
    // eslint-disable-next-line no-shadow
    const enum TargetIntegrityTraits {
        None = 0,
        IsNotExtensible = 1 << 0,
        IsSealed = 1 << 1,
        IsFrozen = 1 << 2,
        Revoked = 1 << 3,
    }
    // eslint-disable-next-line no-shadow
    const enum TargetTraits {
        None = 0,
        IsArray = 1 << 0,
        IsFunction = 1 << 1,
        IsArrowFunction = 1 << 2,
        IsObject = 1 << 3,
        Revoked = 1 << 4,
    }

    return function createHooksCallback(
        color: string,
        trapMutations: boolean,
        // eslint-disable-next-line @typescript-eslint/default-param-last
        _supportFlags: SupportFlagsEnum = SupportFlagsEnum.None,
        foreignCallableHooksCallback: HooksCallback,
        options?: InitLocalOptions
    ): HooksCallback {
        const { distortionCallback = (o: ProxyTarget) => o, instrumentation } = options || {
            __proto__: null,
        };

        const INBOUND_INSTRUMENTATION_LABEL = `to:${color}`;
        const OUTBOUND_INSTRUMENTATION_LABEL = `from:${color}`;
        const PROXY_TARGET_TO_POINTER_MAP = new WeakMap();

        let foreignCallablePushTarget: CallablePushTarget;
        let foreignCallableApply: CallableApply;
        let foreignCallableConstruct: CallableConstruct;
        let foreignCallableDefineProperty: CallableDefineProperty;
        let foreignCallableDeleteProperty: CallableDeleteProperty;
        let foreignCallableGetOwnPropertyDescriptor: CallableGetOwnPropertyDescriptor;
        let foreignCallableGetPrototypeOf: CallableGetPrototypeOf;
        let foreignCallableHas: CallableHas;
        let foreignCallableIsExtensible: CallableIsExtensible;
        let foreignCallableOwnKeys: CallableOwnKeys;
        let foreignCallablePreventExtensions: CallablePreventExtensions;
        let foreignCallableSet: CallableSet;
        let foreignCallableSetPrototypeOf: CallableSetPrototypeOf;
        let foreignCallableGetSerializedValueOfTarget: CallableGetSerializedValueOfTarget;
        let foreignCallableGetTargetIntegrityTraits: CallableGetTargetIntegrityTraits;
        let foreignCallableGetToStringTagOfTarget: CallableGetToStringTagOfTarget;
        let foreignCallableIsTargetLive: CallableIsTargetLive;
        let foreignCallableIsTargetRevoked: CallableIsTargetRevoked;
        let foreignCallableWarn: CallableWarn;
        let foreignCallableBatchGetAndHasToStringSymbolTag: CallableBatchGetAndHasToStringSymbolTag;
        let foreignCallableBatchGetPrototypeOfAndOwnPropertyDescriptors: CallableBatchGetPrototypeOfAndOwnPropertyDescriptors;
        let foreignCallableBatchGetPrototypeOfWhenHasNoOwnProperty: CallableBatchGetPrototypeOfWhenHasNoOwnProperty;
        let foreignCallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor: CallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor;
        let lastProxyTrapCalled = ProxyHandlerTraps.None;
        let nearMembraneSymbolHasTrapGate = false;
        let selectedTarget: undefined | ProxyTarget;

        function copyForeignOwnPropertyDescriptorsAndPrototypeToShadowTarget(
            foreignTargetPointer: Pointer,
            shadowTarget: ShadowTarget
        ): void {
            const protoPointerOrNull = foreignCallableBatchGetPrototypeOfAndOwnPropertyDescriptors(
                foreignTargetPointer,
                (...descriptorTuples) => {
                    const descriptors: PropertyDescriptorMap = {};
                    for (let i = 0, { length } = descriptorTuples; i < length; i += 7) {
                        const key = descriptorTuples[i] as string | symbol;
                        (descriptors as any)[key] = createDescriptorFromMeta(
                            descriptorTuples[i + 1] as boolean | symbol, // configurable
                            descriptorTuples[i + 2] as boolean | symbol, // enumerable
                            descriptorTuples[i + 3] as boolean | symbol, // writable
                            descriptorTuples[i + 4] as PointerOrPrimitive, // valuePointer
                            descriptorTuples[i + 5] as PointerOrPrimitive, // getPointer
                            descriptorTuples[i + 6] as PointerOrPrimitive // setPointer
                        );
                    }
                    // Use `ObjectDefineProperties` instead of individual
                    // `ReflectDefineProperty` calls for better performance.
                    ObjectDefineProperties(shadowTarget, descriptors);
                }
            );
            const proto = protoPointerOrNull
                ? (getLocalValue(protoPointerOrNull) as object)
                : (protoPointerOrNull as null);
            ReflectSetPrototypeOf(shadowTarget, proto);
        }

        // metadata is the transferable descriptor definition
        function createDescriptorFromMeta(
            configurable: boolean | symbol,
            enumerable: boolean | symbol,
            writable: boolean | symbol,
            valuePointer: PointerOrPrimitive,
            getPointer: PointerOrPrimitive,
            setPointer: PointerOrPrimitive
        ): PropertyDescriptor {
            // @ts-ignore: TS doesn't like __proto__ on property descriptors.
            const safeDesc: PropertyDescriptor = { __proto__: null };
            if (configurable !== LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL) {
                safeDesc.configurable = !!configurable;
            }
            if (enumerable !== LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL) {
                safeDesc.enumerable = !!enumerable;
            }
            if (writable !== LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL) {
                safeDesc.writable = !!writable;
            }
            if (getPointer !== LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL) {
                safeDesc.get = getLocalValue(getPointer);
            }
            if (setPointer !== LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL) {
                safeDesc.set = getLocalValue(setPointer);
            }
            if (valuePointer !== LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL) {
                safeDesc.value = getLocalValue(valuePointer);
            }
            return safeDesc;
        }

        function createPointer(originalTarget: ProxyTarget): () => void {
            // assert: originalTarget is a ProxyTarget
            const pointer = (): void => {
                // assert: selectedTarget is undefined
                selectedTarget = originalTarget;
            };
            if (DEBUG_MODE) {
                // In case debugging is needed, the following lines can help:
                pointer['[[OriginalTarget]]'] = originalTarget;
                pointer['[[Color]]'] = color;
            }
            return pointer;
        }

        function createShadowTarget(
            targetTraits: TargetTraits,
            targetFunctionName: string | undefined
        ): ShadowTarget {
            let shadowTarget: ShadowTarget;
            if (targetTraits & TargetTraits.IsFunction) {
                // This shadow target is never invoked. It's needed to avoid
                // proxy trap invariants. Because it's not invoked the code does
                // not need to be instrumented for code coverage.
                //
                // istanbul ignore next
                shadowTarget =
                    // eslint-disable-next-line func-names
                    targetTraits & TargetTraits.IsArrowFunction ? () => {} : function () {};
                if (typeof targetFunctionName === 'string') {
                    // This is only really needed for debugging,
                    // it helps to identify the proxy by name
                    ReflectDefineProperty(shadowTarget, 'name', {
                        // @ts-ignore: TS doesn't like __proto__ on property descriptors.
                        __proto__: null,
                        configurable: true,
                        enumerable: false,
                        value: targetFunctionName,
                        writable: false,
                    });
                }
            } else if (targetTraits & TargetTraits.IsArray) {
                shadowTarget = [];
            } else {
                shadowTarget = {};
            }
            return shadowTarget;
        }

        // This is needed even when using ShadowRealm, because the errors are
        // not going to cross the callable boundary in a try/catch, instead,
        // they need to be ported via the membrane artifacts.
        function foreignErrorControl<T extends (...args: any[]) => any>(foreignFn: T): T {
            return <T>function foreignErrorControlFn(this: any, ...args: any[]): any {
                try {
                    return ReflectApply(foreignFn, this, args);
                } catch (e: any) {
                    const pushedError = getSelectedTarget();
                    if (pushedError === undefined) {
                        throw new TypeErrorCtor(e?.message);
                    }
                    throw pushedError;
                }
            };
        }

        function getDescriptorMeta(
            unsafePartialDesc: PropertyDescriptor
        ): Parameters<CallableDescriptorCallback> {
            const safePartialDesc = toSafeDescriptor(unsafePartialDesc);
            const { configurable, enumerable, writable, value, get, set } = safePartialDesc;
            // prettier-ignore
            return [
                'configurable' in safePartialDesc
                    ? !!configurable
                    : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL,
                'enumerable' in safePartialDesc
                    ? !!enumerable
                    : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL,
                'writable' in safePartialDesc
                    ? !!writable
                    : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL,
                'value' in safePartialDesc
                    ? getTransferableValue(value)
                    : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL,
                'get' in safePartialDesc
                    ? getTransferableValue(get)
                    : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL,
                'set' in safePartialDesc
                    ? getTransferableValue(set)
                    : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL,
            ];
        }

        function getDistortedValue(target: ProxyTarget): ProxyTarget {
            let distortedTarget: ProxyTarget | undefined;
            try {
                distortedTarget = distortionCallback(target);
                return distortedTarget;
            } finally {
                // if a distortion entry is found, it must be a valid proxy target
                if (distortedTarget !== target && typeof distortedTarget !== typeof target) {
                    // eslint-disable-next-line no-unsafe-finally
                    throw new TypeErrorCtor(`Invalid distortion ${target}.`);
                }
            }
        }

        function getLocalValue(pointerOrPrimitive: PointerOrPrimitive): any {
            if (typeof pointerOrPrimitive === 'function') {
                pointerOrPrimitive();
                return getSelectedTarget();
            }
            return pointerOrPrimitive;
        }

        function getSelectedTarget(): any {
            // assert: selectedTarget is a ProxyTarget
            const result = selectedTarget;
            selectedTarget = undefined;
            return result;
        }

        function getSerializedValueOfTarget(target: ProxyTarget): SerializedValue | undefined {
            const brand = ReflectApply(ObjectProtoToString, target, []);
            switch (brand) {
                // The brand(s) below represent boxed primitives of `ESGlobalKeys`
                // in packages/near-membrane-base/src/intrinsics.ts which are not
                // remapped or reflective.
                case '[object BigInt]': {
                    return SUPPORTS_BIG_INT
                        ? ReflectApply(BigIntProtoValueOf!, target, [])
                        : undefined;
                }
                case '[object Boolean]':
                    return ReflectApply(BooleanProtoValueOf, target, []);
                case '[object Number]':
                    return ReflectApply(NumberProtoValueOf, target, []);
                case '[object RegExp]':
                    return JSONStringify({
                        __proto__: null,
                        flags: ReflectApply(RegExpProtoFlagsGetter, target, []),
                        source: ReflectApply(RegExpProtoSourceGetter, target, []),
                    });
                case '[object String]':
                    return ReflectApply(StringProtoValueOf, target, []);
                case '[object Symbol]':
                    return ReflectApply(SymbolProtoValueOf, target, []);
                default:
                    return undefined;
            }
        }

        function getTargetTraits(target: object): TargetTraits {
            let targetTraits = TargetTraits.None;
            const targetIsFunction = typeof target === 'function';
            if (targetIsFunction) {
                targetTraits |= TargetTraits.IsFunction;
                // A target may be a proxy that is revoked or throws in its
                // "has" trap.
                try {
                    // Detect arrow functions.
                    if (!('prototype' in target)) {
                        targetTraits |= TargetTraits.IsArrowFunction;
                    }
                    return targetTraits;
                    // eslint-disable-next-line no-empty
                } catch {}
            }
            let targetIsArray = false;
            try {
                targetIsArray = isArrayOrThrowForRevoked(target);
            } catch {
                targetTraits |= TargetTraits.Revoked;
            }
            if (targetIsArray) {
                targetTraits |= TargetTraits.IsArray;
            } else if (!targetIsFunction) {
                targetTraits |= TargetTraits.IsObject;
            }
            return targetTraits;
        }

        function getTargetIntegrityTraits(target: object): TargetIntegrityTraits {
            let targetIntegrityTraits = TargetIntegrityTraits.None;
            // A target may be a proxy that is revoked or throws in its
            // "isExtensible" trap.
            try {
                if (ObjectIsFrozen(target)) {
                    targetIntegrityTraits |=
                        TargetIntegrityTraits.IsFrozen &
                        TargetIntegrityTraits.IsSealed &
                        TargetIntegrityTraits.IsNotExtensible;
                } else if (ObjectIsSealed(target)) {
                    targetIntegrityTraits |=
                        TargetIntegrityTraits.IsSealed & TargetIntegrityTraits.IsNotExtensible;
                } else if (!ReflectIsExtensible(target)) {
                    targetIntegrityTraits |= TargetIntegrityTraits.IsNotExtensible;
                }
            } catch {
                try {
                    isArrayOrThrowForRevoked(target);
                } catch {
                    targetIntegrityTraits |= TargetIntegrityTraits.Revoked;
                }
            }
            return targetIntegrityTraits;
        }

        function getToStringTagOfTarget(target: ProxyTarget): string {
            // Section 19.1.3.6: Object.prototype.toString()
            // Step 16: If `Type(tag)` is not `String`, let `tag` be `builtinTag`.
            // https://tc39.github.io/ecma262/#sec-object.prototype.tostring
            const brand = ReflectApply(ObjectProtoToString, target, []);
            return ReflectApply(StringProtoSlice, brand, [8, -1]);
        }

        function getTransferablePointer(originalTarget: ProxyTarget): Pointer {
            let proxyPointer = ReflectApply(WeakMapProtoGet, PROXY_TARGET_TO_POINTER_MAP, [
                originalTarget,
            ]);
            if (proxyPointer) {
                return proxyPointer;
            }
            const distortedTarget = getDistortedValue(originalTarget);
            // The closure works as the implicit WeakMap.
            const targetPointer = createPointer(distortedTarget);
            const targetTraits = getTargetTraits(distortedTarget);
            let targetFunctionName: string | undefined;
            if (typeof originalTarget === 'function') {
                if (DEBUG_MODE) {
                    try {
                        // A revoked proxy will throw when reading the function name.
                        const unsafeNameDesc = ReflectGetOwnPropertyDescriptor(
                            originalTarget,
                            'name'
                        );
                        if (unsafeNameDesc) {
                            const safeNameDesc = toSafeDescriptor(unsafeNameDesc);
                            const { value: safeNameDescValue } = safeNameDesc;
                            if (typeof safeNameDescValue === 'string') {
                                targetFunctionName = safeNameDescValue;
                            }
                        }
                    } catch {
                        // Intentionally swallowing the error because this method
                        // is just extracting the function in a way that it should
                        // always succeed except for the cases in which the provider
                        // is a proxy that is either revoked or has some logic to
                        // prevent reading the name property descriptor.
                    }
                }
            }
            proxyPointer = foreignCallablePushTarget(
                targetPointer,
                targetTraits,
                targetFunctionName
            );

            // the WeakMap is populated with the original target rather then the distorted one
            // while the pointer always uses the distorted one.
            // TODO: this mechanism poses another issue, which is that the return value of
            // getSelectedTarget() can never be used to call across the membrane because that
            // will cause a wrapping around the potential distorted value instead of the original
            // value. This is not fatal, but implies that for every distorted value where will
            // two proxies that are not ===, which is weird. Guaranteeing this is not easy because
            // it means auditing the code.
            ReflectApply(WeakMapProtoSet, PROXY_TARGET_TO_POINTER_MAP, [
                originalTarget,
                proxyPointer,
            ]);
            return proxyPointer;
        }

        function getTransferableValue(value: any): PointerOrPrimitive {
            // Internationally ignoring the case of (typeof document.all === 'undefined')
            // because in the reserve membrane, you never get one of those exotic objects.
            if (typeof value === 'undefined') {
                return undefined;
            }
            // TODO: What other ways to optimize this method?
            if (value === null || (typeof value !== 'function' && typeof value !== 'object')) {
                return value;
            }
            return getTransferablePointer(value);
        }

        // This wrapping mechanism provides the means to add instrumentation
        // to the callable functions used to coordinate work between the sides
        // of the membrane.
        // TODO: do we need to pass more info into instrumentation hooks?
        // prettier-ignore
        function instrumentCallableWrapper<T extends (...args: any[]) => any>(
            fn: T,
            activityName: string,
            crossingDirection: string): T {
            if (instrumentation) {
                return <T>function instrumentedFn(this: any, ...args: any[]): any {
                    const activity = instrumentation.startActivity(activityName, {
                        crossingDirection
                    });
                    try {
                        return ReflectApply(fn, this, args);
                    } catch (e: any) {
                        activity.error(e);
                        throw e;
                    } finally {
                        activity.stop();
                    }
                };
            }
            return fn;
        }

        function isTargetLive(target: ProxyTarget): boolean {
            if (target === ObjectProto) {
                return false;
            }
            if (typeof target === 'object') {
                if (
                    // We only check for typed arrays here since arrays are
                    // marked as live in the BoundaryProxyHandler constructor.
                    ArrayBufferIsView(target)
                ) {
                    return true;
                }
                const { constructor } = target;
                if (constructor === ObjectCtor) {
                    // If the constructor, own or inherited, points to `Object`
                    // then `value` is not likely a prototype object.
                    return true;
                }
                if (ReflectGetPrototypeOf(target) === null) {
                    // Ensure `value` is not an `Object.prototype` from an iframe.
                    return typeof constructor !== 'function' || constructor.prototype !== target;
                }
            }
            return ReflectApply(ObjectProtoHasOwnProperty, target, [
                LOCKER_LIVE_VALUE_MARKER_SYMBOL,
            ]);
        }

        function isTargetRevoked(target: ProxyTarget): boolean {
            try {
                isArrayOrThrowForRevoked(target);
                return false;
                //  eslint-disable-next-line no-empty
            } catch {}
            return true;
        }

        function lockShadowTarget(shadowTarget: ShadowTarget, foreignTargetPointer: Pointer): void {
            copyForeignOwnPropertyDescriptorsAndPrototypeToShadowTarget(
                foreignTargetPointer,
                shadowTarget
            );
            ReflectPreventExtensions(shadowTarget);
        }

        function lookupForeignDescriptor(
            foreignTargetPointer: Pointer,
            shadowTarget: ShadowTarget,
            key: string | symbol
        ): PropertyDescriptor | undefined {
            let safeDesc;
            const protoPointerOrNull =
                foreignCallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor(
                    foreignTargetPointer,
                    key,
                    (configurable, enumerable, writable, valuePointer, getPointer, setPointer) => {
                        safeDesc = createDescriptorFromMeta(
                            configurable,
                            enumerable,
                            writable,
                            valuePointer,
                            getPointer,
                            setPointer
                        );
                        if (safeDesc.configurable === false) {
                            // Update the descriptor to non-configurable on the
                            // shadow target.
                            ReflectDefineProperty(shadowTarget, key, safeDesc);
                        }
                    }
                );
            if (safeDesc) {
                return safeDesc;
            }
            // Avoiding calling the has trap for any proto chain operation,
            // instead we implement the regular logic here in this trap.
            let currentObject = protoPointerOrNull
                ? (getLocalValue(protoPointerOrNull) as object)
                : (protoPointerOrNull as null);
            while (currentObject) {
                const unsafeDesc = ReflectGetOwnPropertyDescriptor(currentObject, key);
                if (unsafeDesc) {
                    return toSafeDescriptor(unsafeDesc);
                }
                currentObject = ReflectGetPrototypeOf(currentObject);
            }
            return undefined;
        }

        function pushErrorAcrossBoundary(e: any): any {
            const foreignErrorPointer = getTransferableValue(e);
            if (typeof foreignErrorPointer === 'function') {
                foreignErrorPointer();
            }
            return e;
        }

        function toSafeDescriptor<T extends PropertyDescriptor>(desc: T): T {
            ReflectSetPrototypeOf(desc, null);
            return desc;
        }

        class BoundaryProxyHandler implements ProxyHandler<ShadowTarget> {
            // public fields
            defineProperty: ProxyHandler<ShadowTarget>['defineProperty'];

            deleteProperty: ProxyHandler<ShadowTarget>['deleteProperty'];

            get: ProxyHandler<ShadowTarget>['get'];

            getOwnPropertyDescriptor: ProxyHandler<ShadowTarget>['getOwnPropertyDescriptor'];

            getPrototypeOf: ProxyHandler<ShadowTarget>['getPrototypeOf'];

            has: ProxyHandler<ShadowTarget>['has'];

            isExtensible: ProxyHandler<ShadowTarget>['isExtensible'];

            ownKeys: ProxyHandler<ShadowTarget>['ownKeys'];

            preventExtensions: ProxyHandler<ShadowTarget>['preventExtensions'];

            proxy: ShadowTarget;

            revoke: () => void;

            set: ProxyHandler<ShadowTarget>['set'];

            setPrototypeOf: ProxyHandler<ShadowTarget>['setPrototypeOf'];

            serializedValue: string | undefined;

            unbrandedTag: string | undefined;

            // The membrane color help developers identify which side of the
            // membrane they are debugging.
            readonly color = color;

            private readonly foreignTargetPointer: Pointer;

            private readonly foreignTargetTraits = TargetTraits.None;

            constructor(
                foreignTargetPointer: Pointer,
                foreignTargetTraits: TargetTraits,
                foreignTargetFunctionName: string | undefined
            ) {
                const isRevoked = foreignTargetTraits & TargetTraits.Revoked;
                const isUnrevokedObject = isRevoked
                    ? TargetTraits.None
                    : foreignTargetTraits & TargetTraits.IsObject;
                const shadowTarget = createShadowTarget(
                    foreignTargetTraits,
                    foreignTargetFunctionName
                );
                const { proxy, revoke } = ProxyRevocable(shadowTarget, this);
                this.foreignTargetPointer = foreignTargetPointer;
                this.foreignTargetTraits = foreignTargetTraits;
                this.proxy = proxy;
                this.revoke = revoke;
                this.serializedValue = undefined;
                this.unbrandedTag = undefined;
                // Define default traps.
                this.defineProperty = BoundaryProxyHandler.defaultDefinePropertyTrap;
                this.deleteProperty = BoundaryProxyHandler.defaultDeletePropertyTrap;
                this.isExtensible = BoundaryProxyHandler.defaultIsExtensibleTrap;
                this.getOwnPropertyDescriptor =
                    BoundaryProxyHandler.defaultGetOwnPropertyDescriptorTrap;
                this.getPrototypeOf = BoundaryProxyHandler.defaultGetPrototypeOfTrap;
                this.get = BoundaryProxyHandler.defaultGetTrap;
                this.has = BoundaryProxyHandler.defaultHasTrap;
                this.ownKeys = BoundaryProxyHandler.defaultOwnKeysTrap;
                this.preventExtensions = BoundaryProxyHandler.defaultPreventExtensionsTrap;
                this.setPrototypeOf = BoundaryProxyHandler.defaultSetPrototypeOfTrap;
                this.set = BoundaryProxyHandler.defaultSetTrap;
                if (isRevoked) {
                    revoke();
                } else if (isUnrevokedObject) {
                    // Lazily define unbrandedTag.
                    let unbrandedTag: string | undefined | symbol =
                        LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                    ReflectApply(ObjectProto__defineGetter__, this, [
                        'unbrandedTag',
                        () => {
                            if (unbrandedTag === LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL) {
                                const toStringTag = foreignCallableGetToStringTagOfTarget(
                                    this.foreignTargetPointer
                                );
                                // The default language toStringTag is "Object".
                                // If receive "Object" we return `undefined` to
                                // let the language resolve it naturally without
                                // projecting a value.
                                unbrandedTag = toStringTag === 'Object' ? undefined : toStringTag;
                            }
                            return unbrandedTag;
                        },
                    ]);
                }
                if (trapMutations) {
                    if (foreignTargetTraits & TargetTraits.IsArray) {
                        this.makeProxyLive();
                    }
                } else {
                    if (isUnrevokedObject) {
                        // Lazily define serializedValue.
                        let serializedValue: SerializedValue | undefined | symbol =
                            LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                        ReflectApply(ObjectProto__defineGetter__, this, [
                            'serializedValue',
                            () => {
                                if (
                                    serializedValue === LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL
                                ) {
                                    serializedValue = foreignCallableGetSerializedValueOfTarget(
                                        this.foreignTargetPointer
                                    );
                                }
                                return serializedValue;
                            },
                        ]);
                    }
                    // Future optimization: Hoping proxies with frozen handlers
                    // can be faster. If local mutations are not trapped, then
                    // freezing the handler is ok because it is not expecting to
                    // change in the future.
                    ObjectFreeze(this);
                }
            }

            // apply trap is generic, and should never change independently of the type of membrane
            readonly apply = function applyTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                thisArg: any,
                args: any[]
            ): any {
                lastProxyTrapCalled = ProxyHandlerTraps.Apply;
                const { foreignTargetPointer } = this;
                const transferableThisArg = getTransferableValue(thisArg);
                const combinedArgs = [foreignTargetPointer, transferableThisArg];
                const { length } = args;
                const { length: combinedOffset } = combinedArgs;
                combinedArgs.length += length;
                for (let i = 0; i < length; i += 1) {
                    const arg = args[i];
                    const combinedIndex = i + combinedOffset;
                    // Inlining `getTransferableValue`.
                    if (typeof arg === 'undefined') {
                        combinedArgs[combinedIndex] = undefined;
                    } else if (
                        arg === null ||
                        (typeof arg !== 'function' && typeof arg !== 'object')
                    ) {
                        combinedArgs[combinedIndex] = arg;
                    } else {
                        combinedArgs[combinedIndex] = getTransferablePointer(arg);
                    }
                }
                return getLocalValue(ReflectApply(foreignCallableApply, undefined, combinedArgs));
            };

            // construct trap is generic, and should never change independently
            // of the type of membrane
            readonly construct = function constructTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                args: any[],
                newTarget: any
            ): any {
                lastProxyTrapCalled = ProxyHandlerTraps.Construct;
                if (newTarget === undefined) {
                    throw new TypeErrorCtor();
                }
                const { foreignTargetPointer } = this;
                const transferableNewTarget = getTransferableValue(newTarget);
                const combinedArgs = [foreignTargetPointer, transferableNewTarget];
                const { length } = args;
                const { length: combinedOffset } = combinedArgs;
                combinedArgs.length += length;
                for (let i = 0; i < length; i += 1) {
                    const arg = args[i];
                    const combinedIndex = i + combinedOffset;
                    // Inline `getTransferableValue`.
                    if (typeof arg === 'undefined') {
                        combinedArgs[combinedIndex] = undefined;
                    } else if (
                        arg === null ||
                        (typeof arg !== 'function' && typeof arg !== 'object')
                    ) {
                        combinedArgs[combinedIndex] = arg;
                    } else {
                        combinedArgs[combinedIndex] = getTransferablePointer(arg);
                    }
                }
                return getLocalValue(
                    ReflectApply(foreignCallableConstruct, undefined, combinedArgs)
                );
            };

            // internal utilities
            private makeProxyLive() {
                // Replace pending traps with live traps that can work with the
                // target without taking snapshots.
                this.deleteProperty = BoundaryProxyHandler.passthruDeletePropertyTrap;
                this.defineProperty = BoundaryProxyHandler.passthruDefinePropertyTrap;
                this.get = BoundaryProxyHandler.hybridGetTrap;
                this.has = BoundaryProxyHandler.hybridHasTrap;
                this.preventExtensions = BoundaryProxyHandler.passthruPreventExtensionsTrap;
                this.set = BoundaryProxyHandler.passthruSetTrap;
                this.setPrototypeOf = BoundaryProxyHandler.passthruSetPrototypeOfTrap;
                // Future optimization: Hoping proxies with frozen handlers can be faster.
                ObjectFreeze(this);
            }

            private makeProxyStatic(shadowTarget: ShadowTarget) {
                const { foreignTargetPointer } = this;
                if (DEBUG_MODE) {
                    try {
                        foreignCallableWarn(
                            'Mutations on the membrane of an object originating ' +
                                'outside of the sandbox will not be reflected on ' +
                                'the object itself:',
                            foreignTargetPointer
                        );
                        // eslint-disable-next-line no-empty
                    } catch {}
                }
                const targetIntegrityTraits =
                    foreignCallableGetTargetIntegrityTraits(foreignTargetPointer);
                if (targetIntegrityTraits & TargetIntegrityTraits.Revoked) {
                    // the target is a revoked proxy, in which case we revoke
                    // this proxy as well.
                    this.revoke();
                    return;
                }
                // A proxy can revoke itself when traps are triggered and break
                // the membrane, therefore we need protection.
                try {
                    copyForeignOwnPropertyDescriptorsAndPrototypeToShadowTarget(
                        foreignTargetPointer,
                        shadowTarget
                    );
                } catch {
                    if (foreignCallableIsTargetRevoked(foreignTargetPointer)) {
                        this.revoke();
                        return;
                    }
                }
                // Preserve the semantics of the target.
                if (targetIntegrityTraits & TargetIntegrityTraits.IsFrozen) {
                    ObjectFreeze(shadowTarget);
                } else if (targetIntegrityTraits & TargetIntegrityTraits.IsSealed) {
                    ObjectSeal(shadowTarget);
                } else if (targetIntegrityTraits & TargetIntegrityTraits.IsNotExtensible) {
                    ReflectPreventExtensions(shadowTarget);
                }
                // Reset all traps except apply and construct for static proxies
                // since the proxy target is the shadow target and all operations
                // are going to be applied to it rather than the real target.
                this.defineProperty = BoundaryProxyHandler.staticDefinePropertyTrap;
                this.deleteProperty = BoundaryProxyHandler.staticDeletePropertyTrap;
                this.get = BoundaryProxyHandler.staticGetTrap;
                this.getOwnPropertyDescriptor =
                    BoundaryProxyHandler.staticGetOwnPropertyDescriptorTrap;
                this.getPrototypeOf = BoundaryProxyHandler.staticGetPrototypeOfTrap;
                this.has = BoundaryProxyHandler.staticHasTrap;
                this.isExtensible = BoundaryProxyHandler.staticIsExtensibleTrap;
                this.ownKeys = BoundaryProxyHandler.staticOwnKeysTrap;
                this.preventExtensions = BoundaryProxyHandler.staticPreventExtensionsTrap;
                this.set = BoundaryProxyHandler.staticSetTrap;
                this.setPrototypeOf = BoundaryProxyHandler.staticSetPrototypeOfTrap;
                // Future optimization: Hoping proxies with frozen handlers can be faster.
                ObjectFreeze(this);
            }

            private makeProxyUnambiguous(shadowTarget: ShadowTarget) {
                if (foreignCallableIsTargetLive(this.foreignTargetPointer)) {
                    this.makeProxyLive();
                } else {
                    this.makeProxyStatic(shadowTarget);
                }
            }

            // logic implementation of all traps

            // default traps:

            // Pending traps are only really needed if this membrane traps
            // mutations to avoid mutations operations on the side of the membrane.
            // TODO: find a way to optimize the declaration rather than instantiation
            private static defaultDefinePropertyTrap = trapMutations
                ? BoundaryProxyHandler.pendingDefinePropertyTrap
                : BoundaryProxyHandler.passthruDefinePropertyTrap;

            private static defaultDeletePropertyTrap = trapMutations
                ? BoundaryProxyHandler.pendingDeletePropertyTrap
                : BoundaryProxyHandler.passthruDeletePropertyTrap;

            private static defaultGetOwnPropertyDescriptorTrap =
                BoundaryProxyHandler.passthruOwnPropertyDescriptorTrap;

            private static defaultGetPrototypeOfTrap =
                BoundaryProxyHandler.passthruGetPrototypeOfTrap;

            private static defaultGetTrap = trapMutations
                ? BoundaryProxyHandler.hybridGetTrap
                : BoundaryProxyHandler.passthruGetTrap;

            private static defaultHasTrap = trapMutations
                ? BoundaryProxyHandler.hybridHasTrap
                : BoundaryProxyHandler.passthruHasTrap;

            private static defaultIsExtensibleTrap = BoundaryProxyHandler.passthruIsExtensibleTrap;

            private static defaultOwnKeysTrap = BoundaryProxyHandler.passthruOwnKeysTrap;

            private static defaultPreventExtensionsTrap = trapMutations
                ? BoundaryProxyHandler.pendingPreventExtensionsTrap
                : BoundaryProxyHandler.passthruPreventExtensionsTrap;

            private static defaultSetTrap = trapMutations
                ? BoundaryProxyHandler.pendingSetTrap
                : BoundaryProxyHandler.passthruSetTrap;

            private static defaultSetPrototypeOfTrap = trapMutations
                ? BoundaryProxyHandler.pendingSetPrototypeOfTrap
                : BoundaryProxyHandler.passthruSetPrototypeOfTrap;

            // hybrid traps
            // (traps that operate on their shadowTarget, proxy, and foreignTargetPointer):

            private static hybridGetTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                key: string | symbol,
                receiver: any
            ): ReturnType<typeof Reflect.get> {
                const safeDesc = lookupForeignDescriptor(
                    this.foreignTargetPointer,
                    shadowTarget,
                    key
                );
                if (safeDesc) {
                    const { get: getter, value: localValue } = safeDesc;
                    if (getter) {
                        // Even though the getter function exists, we can't use
                        // `ReflectGet` because there might be a distortion for
                        // that getter function, in which case we must resolve
                        // the local getter and call it instead.
                        return ReflectApply(getter, receiver, []);
                    }
                    return localValue;
                }
                if (key === TO_STRING_TAG_SYMBOL) {
                    return this.unbrandedTag;
                }
                return undefined;
            }

            private static hybridHasTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                key: string | symbol
            ): ReturnType<typeof Reflect.has> {
                const trueOrProtoPointerOrNull =
                    foreignCallableBatchGetPrototypeOfWhenHasNoOwnProperty(
                        this.foreignTargetPointer,
                        key
                    );
                if (trueOrProtoPointerOrNull === true) {
                    return true;
                }
                // Avoiding calling the has trap for any proto chain operation,
                // instead we implement the regular logic here in this trap.
                let currentObject = trueOrProtoPointerOrNull
                    ? (getLocalValue(trueOrProtoPointerOrNull) as object)
                    : (trueOrProtoPointerOrNull as null);
                while (currentObject) {
                    if (ReflectApply(ObjectProtoHasOwnProperty, currentObject, [key])) {
                        return true;
                    }
                    currentObject = ReflectGetPrototypeOf(currentObject);
                }
                return false;
            }

            // passthru forwarding Traps:

            private static passthruDefinePropertyTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                key: string | symbol,
                unsafePartialDesc: PropertyDescriptor
            ): ReturnType<typeof Reflect.defineProperty> {
                lastProxyTrapCalled = ProxyHandlerTraps.DefineProperty;
                const { foreignTargetPointer } = this;
                const descMeta = getDescriptorMeta(unsafePartialDesc);
                const result = foreignCallableDefineProperty(
                    foreignTargetPointer,
                    key,
                    descMeta[0], // configurable
                    descMeta[1], // enumerable
                    descMeta[2], // writable
                    descMeta[3], // valuePointer
                    descMeta[4], // getPointer
                    descMeta[5], // setPointer
                    // foreignCallableNonConfigurableDescriptorCallback
                    (configurable, enumerable, writable, valuePointer, getPointer, setPointer) => {
                        // Update the descriptor to non-configurable on the
                        // shadow target.
                        ReflectDefineProperty(
                            shadowTarget,
                            key,
                            createDescriptorFromMeta(
                                configurable,
                                enumerable,
                                writable,
                                valuePointer,
                                getPointer,
                                setPointer
                            )
                        );
                    }
                );
                return result;
            }

            private static passthruDeletePropertyTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                key: string | symbol
            ): ReturnType<typeof Reflect.deleteProperty> {
                lastProxyTrapCalled = ProxyHandlerTraps.DeleteProperty;
                return foreignCallableDeleteProperty(this.foreignTargetPointer, key);
            }

            private static passthruGetTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                key: string | symbol,
                receiver: any
            ): ReturnType<typeof Reflect.get> {
                // Only allow accessing near-membrane symbol values if the
                // BoundaryProxyHandler.has trap has been called immediately
                // before and the symbol does not exist.
                nearMembraneSymbolHasTrapGate &&= lastProxyTrapCalled === ProxyHandlerTraps.Has;
                lastProxyTrapCalled = ProxyHandlerTraps.Get;
                if (nearMembraneSymbolHasTrapGate) {
                    // Exit without performing a [[Get]] for near-membrane symbols
                    // because we know when the nearMembraneSymbolHasTrapGate is
                    // open that there is no shadowed symbol value.
                    if (key === LOCKER_NEAR_MEMBRANE_SYMBOL) {
                        return true;
                    }
                    if (key === LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL) {
                        return this.serializedValue;
                    }
                }
                const result = getLocalValue(
                    foreignCallableBatchGetAndHasToStringSymbolTag(
                        this.foreignTargetPointer,
                        this.foreignTargetTraits,
                        key,
                        getTransferableValue(receiver)
                    )
                );
                if (
                    key === TO_STRING_TAG_SYMBOL &&
                    result === LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL
                ) {
                    return this.unbrandedTag;
                }
                return result;
            }

            private static passthruGetPrototypeOfTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget
            ): ReturnType<typeof Reflect.getPrototypeOf> {
                lastProxyTrapCalled = ProxyHandlerTraps.GetPrototypeOf;
                const protoPointerOrNull = foreignCallableGetPrototypeOf(this.foreignTargetPointer);
                return protoPointerOrNull
                    ? (getLocalValue(protoPointerOrNull) as object)
                    : (protoPointerOrNull as null);
            }

            private static passthruHasTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                key: string | symbol
            ): ReturnType<typeof Reflect.has> {
                lastProxyTrapCalled = ProxyHandlerTraps.Has;
                const result = foreignCallableHas(this.foreignTargetPointer, key);
                // The near-membrane symbol gate is open if the symbol does not
                // exist on the object or its [[Prototype]].
                nearMembraneSymbolHasTrapGate =
                    !result &&
                    (key === LOCKER_NEAR_MEMBRANE_SYMBOL ||
                        key === LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL);
                return result;
            }

            private static passthruIsExtensibleTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget
            ): ReturnType<typeof Reflect.isExtensible> {
                lastProxyTrapCalled = ProxyHandlerTraps.IsExtensible;
                // Check if already locked.
                if (ReflectIsExtensible(shadowTarget)) {
                    const { foreignTargetPointer } = this;
                    if (foreignCallableIsExtensible(foreignTargetPointer)) {
                        return true;
                    }
                    lockShadowTarget(shadowTarget, foreignTargetPointer);
                }
                return false;
            }

            private static passthruOwnKeysTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget
            ): ReturnType<typeof Reflect.ownKeys> {
                lastProxyTrapCalled = ProxyHandlerTraps.OwnKeys;
                let keys: ReturnType<typeof Reflect.ownKeys>;
                foreignCallableOwnKeys(this.foreignTargetPointer, (...args) => {
                    keys = args;
                });
                // @ts-ignore: Prevent used before assignment error.
                return keys || [];
            }

            private static passthruOwnPropertyDescriptorTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                key: string | symbol
            ): ReturnType<typeof Reflect.getOwnPropertyDescriptor> {
                lastProxyTrapCalled = ProxyHandlerTraps.GetOwnPropertyDescriptor;
                let safeDesc: PropertyDescriptor | undefined;
                foreignCallableGetOwnPropertyDescriptor(
                    this.foreignTargetPointer,
                    key,
                    (configurable, enumerable, writable, valuePointer, getPointer, setPointer) => {
                        safeDesc = createDescriptorFromMeta(
                            configurable,
                            enumerable,
                            writable,
                            valuePointer,
                            getPointer,
                            setPointer
                        );
                        if (safeDesc.configurable === false) {
                            // Update the descriptor to non-configurable on the
                            // shadow target.
                            ReflectDefineProperty(shadowTarget, key, safeDesc);
                        }
                    }
                );
                return safeDesc;
            }

            private static passthruPreventExtensionsTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget
            ): ReturnType<typeof Reflect.preventExtensions> {
                lastProxyTrapCalled = ProxyHandlerTraps.PreventExtensions;
                if (ReflectIsExtensible(shadowTarget)) {
                    const { foreignTargetPointer } = this;
                    const result = foreignCallablePreventExtensions(foreignTargetPointer);
                    if (result & PreventExtensionsResult.False) {
                        if (!(result & PreventExtensionsResult.Extensible)) {
                            // If the target is a proxy manually created, it might
                            // reject the preventExtension call, in which case we
                            // should not attempt to lock down the shadow target.
                            lockShadowTarget(shadowTarget, foreignTargetPointer);
                        }
                        return false;
                    }
                    lockShadowTarget(shadowTarget, foreignTargetPointer);
                }
                return true;
            }

            private static passthruSetPrototypeOfTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                proto: object | null
            ): ReturnType<typeof Reflect.setPrototypeOf> {
                lastProxyTrapCalled = ProxyHandlerTraps.SetPrototypeOf;
                const transferableProto = proto ? getTransferablePointer(proto) : proto;
                return foreignCallableSetPrototypeOf(this.foreignTargetPointer, transferableProto);
            }

            private static passthruSetTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                key: string | symbol,
                value: any,
                receiver: any
            ): boolean {
                lastProxyTrapCalled = ProxyHandlerTraps.Set;
                const { foreignTargetPointer } = this;
                if (this.proxy === receiver) {
                    // Fast path.
                    return foreignCallableSet(
                        foreignTargetPointer,
                        key,
                        getTransferableValue(value),
                        getTransferablePointer(receiver)
                    );
                }
                const safeDesc = lookupForeignDescriptor(foreignTargetPointer, shadowTarget, key);
                // Following the specification steps for
                // OrdinarySetWithOwnDescriptor ( O, P, V, Receiver, ownDesc ).
                // https://tc39.es/ecma262/#sec-ordinarysetwithowndescriptor
                if (safeDesc) {
                    if ('get' in safeDesc || 'set' in safeDesc) {
                        const { set: setter } = safeDesc;
                        if (setter) {
                            // Even though the setter function exists, we can't use
                            // `ReflectSet` because there might be a distortion for
                            // that setter function, in which case we must resolve
                            // the local setter and call it instead.
                            ReflectApply(setter, receiver, [value]);
                            // If there is a setter, it either throw or we can assume
                            // the value was set.
                            return true;
                        }
                        return false;
                    }
                    if (safeDesc.writable === false) {
                        return false;
                    }
                }
                let safeReceiverDesc: PropertyDescriptor | undefined;
                // Exit early if receiver is not object like.
                if (
                    receiver === null ||
                    (typeof receiver !== 'function' && typeof receiver !== 'object')
                ) {
                    return false;
                }
                const unsafeReceiverDesc = ReflectGetOwnPropertyDescriptor(receiver, key);
                if (unsafeReceiverDesc) {
                    safeReceiverDesc = toSafeDescriptor(unsafeReceiverDesc);
                }
                if (safeReceiverDesc) {
                    // Exit early for accessor descriptors or non-writable data
                    // descriptors.
                    if (
                        'get' in safeReceiverDesc ||
                        'set' in safeReceiverDesc ||
                        safeReceiverDesc.writable === false
                    ) {
                        return false;
                    }
                    // Setting the descriptor with only a value entry should not
                    // affect existing descriptor traits.
                    ReflectDefineProperty(receiver, key, {
                        // @ts-ignore: TS doesn't like __proto__ on property descriptors.
                        __proto__: null,
                        value,
                    });
                    return true;
                }
                // `ReflectDefineProperty` and `ReflectSet` both are expected to
                // return `false` when attempting to add a new property if the
                // receiver is not extensible.
                return ReflectDefineProperty(receiver, key, {
                    // @ts-ignore: TS doesn't like __proto__ on property descriptors.
                    __proto__: null,
                    configurable: true,
                    enumerable: true,
                    value,
                    writable: true,
                });
            }

            // pending traps
            private static pendingDefinePropertyTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                key: string | symbol,
                unsafePartialDesc: PropertyDescriptor
            ): ReturnType<typeof Reflect.defineProperty> {
                this.makeProxyUnambiguous(shadowTarget);
                return this.defineProperty!(shadowTarget, key, unsafePartialDesc);
            }

            private static pendingDeletePropertyTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                key: string | symbol
            ): ReturnType<typeof Reflect.deleteProperty> {
                this.makeProxyUnambiguous(shadowTarget);
                return this.deleteProperty!(shadowTarget, key);
            }

            private static pendingPreventExtensionsTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget
            ): ReturnType<typeof Reflect.preventExtensions> {
                this.makeProxyUnambiguous(shadowTarget);
                return this.preventExtensions!(shadowTarget);
            }

            private static pendingSetPrototypeOfTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                proto: object | null
            ): ReturnType<typeof Reflect.setPrototypeOf> {
                this.makeProxyUnambiguous(shadowTarget);
                return this.setPrototypeOf!(shadowTarget, proto);
            }

            private static pendingSetTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                key: string | symbol,
                value: any,
                receiver: any
            ): ReturnType<typeof Reflect.set> {
                this.makeProxyUnambiguous(shadowTarget);
                return this.set!(shadowTarget, key, value, receiver);
            }

            private static staticDefinePropertyTrap = ReflectDefineProperty;

            private static staticDeletePropertyTrap = ReflectDeleteProperty;

            private static staticGetOwnPropertyDescriptorTrap = ReflectGetOwnPropertyDescriptor;

            private static staticGetPrototypeOfTrap = ReflectGetPrototypeOf;

            /**
             * This trap is just `ReflectGet` plus handling of object branding
             * for proxies.
             *
             */
            private static staticGetTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                key: string | symbol,
                receiver: any
            ): ReturnType<typeof Reflect.get> {
                const result = ReflectGet(shadowTarget, key, receiver);
                if (
                    result === undefined &&
                    key === TO_STRING_TAG_SYMBOL &&
                    this.foreignTargetTraits & TargetTraits.IsObject &&
                    !ReflectHas(shadowTarget, key)
                ) {
                    return this.unbrandedTag;
                }
                return result;
            }

            private static staticHasTrap = ReflectHas;

            private static staticIsExtensibleTrap = ReflectIsExtensible;

            private static staticOwnKeysTrap = ReflectOwnKeys;

            private static staticPreventExtensionsTrap = ReflectPreventExtensions;

            private static staticSetPrototypeOfTrap = ReflectSetPrototypeOf;

            private static staticSetTrap = ReflectSet;
        }
        ReflectSetPrototypeOf(BoundaryProxyHandler.prototype, null);

        // future optimization: hoping proxies with frozen handlers can be faster
        ObjectFreeze(BoundaryProxyHandler.prototype);

        // exporting callable hooks for a foreign realm
        foreignCallableHooksCallback(
            // globalThisPointer
            // When crossing, should be mapped to the foreign globalThis
            createPointer(globalThisRef),
            // getSelectedTarget
            getSelectedTarget,
            // getTransferableValue
            getTransferableValue,
            // callableGetPropertyValuePointer: this callable function allows
            // the foreign realm to access a linkable pointer for a property value.
            // In order to do that, the foreign side must provide a pointer and
            // a key access the value in order to produce a pointer
            (targetPointer: Pointer, key: string | symbol) => {
                targetPointer();
                const target = getSelectedTarget();
                const value: ProxyTarget = target[key];
                // TODO: what if the value is not a valid proxy target?
                return createPointer(value);
            },
            // callableEvaluate
            (sourceText: string): PointerOrPrimitive => {
                try {
                    return getTransferableValue(localEval(sourceText));
                } catch (e: any) {
                    throw pushErrorAcrossBoundary(e);
                }
            },
            // callableLinkPointers: this callable function allows the foreign
            // realm to define a linkage between two values across the membrane.
            (targetPointer: Pointer, newPointer: Pointer) => {
                targetPointer();
                const target = getSelectedTarget();
                ReflectApply(WeakMapProtoSet, PROXY_TARGET_TO_POINTER_MAP, [target, newPointer]);
            },
            /**
             * callablePushTarget: This function can be used by a foreign realm to install a proxy
             * into this realm that correspond to an object from the foreign realm. It returns
             * a Pointer that can be used by the foreign realm to pass back a reference to this
             * realm when passing arguments or returning from a foreign callable invocation. This
             * function is extremely important to understand the mechanics of this membrane.
             */
            (
                foreignTargetPointer: () => void,
                foreignTargetTraits: TargetTraits,
                foreignTargetFunctionName: string | undefined
            ): Pointer => {
                const { proxy } = new BoundaryProxyHandler(
                    foreignTargetPointer,
                    foreignTargetTraits,
                    foreignTargetFunctionName
                );
                ReflectApply(WeakMapProtoSet, PROXY_TARGET_TO_POINTER_MAP, [
                    proxy,
                    foreignTargetPointer,
                ]);
                return createPointer(proxy);
            },
            // callableApply
            instrumentCallableWrapper(
                (
                    targetPointer: Pointer,
                    thisArgPointerOrPrimitive: PointerOrPrimitive,
                    ...listOfPointersOrPrimitives: PointerOrPrimitive[]
                ): PointerOrPrimitive => {
                    targetPointer();
                    // Inline getSelectedTarget().
                    const fn = selectedTarget as Function;
                    selectedTarget = undefined;
                    // Inline getLocalValue().
                    let thisArg = thisArgPointerOrPrimitive as ProxyTarget | undefined;
                    if (typeof thisArgPointerOrPrimitive === 'function') {
                        thisArgPointerOrPrimitive();
                        // Inline getSelectedTarget().
                        thisArg = selectedTarget;
                        selectedTarget = undefined;
                    }
                    const { length } = listOfPointersOrPrimitives;
                    const args = new ArrayCtor(length);
                    for (let i = 0; i < length; i += 1) {
                        const pointerOrPrimitive = listOfPointersOrPrimitives[i];
                        // Inline getLocalValue().
                        let localValue = pointerOrPrimitive as ProxyTarget | undefined;
                        if (typeof pointerOrPrimitive === 'function') {
                            pointerOrPrimitive();
                            // Inline getSelectedTarget().
                            localValue = selectedTarget;
                            selectedTarget = undefined;
                        }
                        args[i] = localValue;
                    }
                    let value;
                    try {
                        value = ReflectApply(fn, thisArg, args);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                    // Inline getTransferableValue().
                    if (typeof value === 'undefined') {
                        return undefined;
                    }
                    if (
                        value === null ||
                        (typeof value !== 'function' && typeof value !== 'object')
                    ) {
                        return value;
                    }
                    return getTransferablePointer(value);
                },
                'callableApply',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableConstruct
            instrumentCallableWrapper(
                (
                    targetPointer: Pointer,
                    newTargetPointerOrValue: PointerOrPrimitive,
                    ...listOfPointersOrPrimitives: PointerOrPrimitive[]
                ): PointerOrPrimitive => {
                    targetPointer();
                    // Inline getSelectedTarget().
                    const constructor = selectedTarget as Function;
                    // Inline getLocalValue().
                    let newTarget = newTargetPointerOrValue as Function | undefined;
                    if (typeof newTargetPointerOrValue === 'function') {
                        newTargetPointerOrValue();
                        // Inline getSelectedTarget().
                        newTarget = selectedTarget as Function | undefined;
                        selectedTarget = undefined;
                    }
                    const { length } = listOfPointersOrPrimitives;
                    const args = new ArrayCtor(length);
                    for (let i = 0; i < length; i += 1) {
                        const pointerOrPrimitive = listOfPointersOrPrimitives[i];
                        // Inline getLocalValue().
                        let localValue = pointerOrPrimitive as ProxyTarget | undefined;
                        if (typeof pointerOrPrimitive === 'function') {
                            pointerOrPrimitive();
                            // Inline getSelectedTarget().
                            localValue = selectedTarget;
                            selectedTarget = undefined;
                        }
                        args[i] = localValue;
                    }
                    let value;
                    try {
                        value = ReflectConstruct(constructor, args, newTarget);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                    // Inline getTransferableValue().
                    if (typeof value === 'undefined') {
                        return undefined;
                    }
                    if (
                        value === null ||
                        (typeof value !== 'function' && typeof value !== 'object')
                    ) {
                        return value;
                    }
                    return getTransferablePointer(value);
                },
                'callableConstruct',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableDefineProperty
            instrumentCallableWrapper(
                (
                    targetPointer: Pointer,
                    key: string | symbol,
                    configurable: boolean | symbol,
                    enumerable: boolean | symbol,
                    writable: boolean | symbol,
                    valuePointer: PointerOrPrimitive,
                    getPointer: PointerOrPrimitive,
                    setPointer: PointerOrPrimitive,
                    foreignCallableNonConfigurableDescriptorCallback?: CallableDescriptorCallback
                ): boolean => {
                    targetPointer();
                    const target = getSelectedTarget();
                    let result = false;
                    try {
                        result = ReflectDefineProperty(
                            target,
                            key,
                            createDescriptorFromMeta(
                                configurable,
                                enumerable,
                                writable,
                                valuePointer,
                                getPointer,
                                setPointer
                            )
                        );
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                    if (
                        result &&
                        configurable === false &&
                        typeof foreignCallableNonConfigurableDescriptorCallback === 'function'
                    ) {
                        let unsafeDesc;
                        try {
                            unsafeDesc = ReflectGetOwnPropertyDescriptor(target, key);
                        } catch (e: any) {
                            throw pushErrorAcrossBoundary(e);
                        }
                        if (unsafeDesc) {
                            const descMeta = getDescriptorMeta(unsafeDesc);
                            const { 0: descMeta0 } = descMeta;
                            if (descMeta0 === false) {
                                foreignCallableNonConfigurableDescriptorCallback(
                                    descMeta0, // configurable
                                    descMeta[1], // enumerable
                                    descMeta[2], // writable
                                    descMeta[3], // valuePointer
                                    descMeta[4], // getPointer
                                    descMeta[5] // setPointer
                                );
                            }
                        }
                    }
                    return result;
                },
                'callableDefineProperty',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableDeleteProperty
            instrumentCallableWrapper(
                (targetPointer: Pointer, key: string | symbol): boolean => {
                    targetPointer();
                    const target = getSelectedTarget();
                    try {
                        return ReflectDeleteProperty(target, key);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                },
                'callableDeleteProperty',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableGetOwnPropertyDescriptor
            instrumentCallableWrapper(
                (
                    targetPointer: Pointer,
                    key: string | symbol,
                    foreignCallableDescriptorCallback: CallableDescriptorCallback
                ): void => {
                    targetPointer();
                    const target = getSelectedTarget();
                    let unsafeDesc;
                    try {
                        unsafeDesc = ReflectGetOwnPropertyDescriptor(target, key);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                    if (unsafeDesc) {
                        const descMeta = getDescriptorMeta(unsafeDesc);
                        foreignCallableDescriptorCallback(
                            descMeta[0], // configurable
                            descMeta[1], // enumerable
                            descMeta[2], // writable
                            descMeta[3], // valuePointer
                            descMeta[4], // getPointer
                            descMeta[5] // setPointer
                        );
                    }
                },
                'callableGetOwnPropertyDescriptor',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableGetPrototypeOf
            instrumentCallableWrapper(
                (targetPointer: Pointer): PointerOrPrimitive => {
                    targetPointer();
                    const target = getSelectedTarget();
                    let proto;
                    try {
                        proto = ReflectGetPrototypeOf(target);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                    return proto ? getTransferablePointer(proto) : proto;
                },
                'callableGetPrototypeOf',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableHas
            instrumentCallableWrapper(
                (targetPointer: Pointer, key: string | symbol): boolean => {
                    targetPointer();
                    const target = getSelectedTarget();
                    try {
                        return ReflectHas(target, key);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                },
                'callableHas',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableIsExtensible
            instrumentCallableWrapper(
                (targetPointer: Pointer): boolean => {
                    targetPointer();
                    const target = getSelectedTarget();
                    try {
                        return ReflectIsExtensible(target);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                },
                'callableIsExtensible',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableOwnKeys
            instrumentCallableWrapper(
                (
                    targetPointer: Pointer,
                    foreignCallableKeysCallback: (
                        ...args: ReturnType<typeof Reflect.ownKeys>
                    ) => void
                ): void => {
                    targetPointer();
                    const target = getSelectedTarget();
                    let ownKeys;
                    try {
                        ownKeys = ReflectOwnKeys(target) as (string | symbol)[];
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                    ReflectApply(foreignCallableKeysCallback, undefined, ownKeys);
                },
                'callableOwnKeys',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callablePreventExtensions
            instrumentCallableWrapper(
                (targetPointer: Pointer): PreventExtensionsResult => {
                    targetPointer();
                    const target = getSelectedTarget();
                    let result = PreventExtensionsResult.False;
                    try {
                        if (ReflectPreventExtensions(target)) {
                            result = PreventExtensionsResult.True;
                        }
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                    if (result & PreventExtensionsResult.False && ReflectIsExtensible(target)) {
                        result |= PreventExtensionsResult.Extensible;
                    }
                    return result;
                },
                'callablePreventExtensions',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableSet
            instrumentCallableWrapper(
                (
                    targetPointer: Pointer,
                    key: string | symbol,
                    valuePointer: Pointer,
                    receiverPointerOrPrimitive: PointerOrPrimitive
                ): boolean => {
                    targetPointer();
                    const target = getSelectedTarget();
                    try {
                        return ReflectSet(
                            target,
                            key,
                            getLocalValue(valuePointer),
                            getLocalValue(receiverPointerOrPrimitive)
                        );
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                },
                'callableSet',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableSetPrototypeOf
            instrumentCallableWrapper(
                (targetPointer: Pointer, protoPointerOrNull: Pointer | null): boolean => {
                    targetPointer();
                    const target = getSelectedTarget();
                    const proto = protoPointerOrNull
                        ? (getLocalValue(protoPointerOrNull) as object)
                        : (protoPointerOrNull as null);
                    try {
                        return ReflectSetPrototypeOf(target, proto);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                },
                'callableSetPrototypeOf',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableGetSerializedValueOfTarget
            instrumentCallableWrapper(
                (targetPointer: Pointer): SerializedValue | undefined => {
                    targetPointer();
                    const target = getSelectedTarget();
                    try {
                        return getSerializedValueOfTarget(target);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                },
                'callableGetSerializedValueOfTarget',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableGetTargetIntegrityTraits
            instrumentCallableWrapper(
                (targetPointer: Pointer): TargetIntegrityTraits => {
                    targetPointer();
                    const target = getSelectedTarget();
                    // No need to wrap in a try-catch as `getTargetIntegrityTraits()`
                    // cannot throw.
                    return getTargetIntegrityTraits(target);
                },
                'callableGetTargetIntegrityTraits',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableGetToStringTagOfTarget
            instrumentCallableWrapper(
                (targetPointer: Pointer): string => {
                    targetPointer();
                    const target = getSelectedTarget();
                    try {
                        return getToStringTagOfTarget(target);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                },
                'callableGetToStringTagOfTarget',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableIsTargetLive
            instrumentCallableWrapper(
                (targetPointer: Pointer): boolean => {
                    targetPointer();
                    const target = getSelectedTarget();
                    try {
                        return isTargetLive(target);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                },
                'callableIsTargetLive',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableIsTargetRevoked
            instrumentCallableWrapper(
                (targetPointer: Pointer): boolean => {
                    targetPointer();
                    const target = getSelectedTarget();
                    try {
                        return isTargetRevoked(target);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                },
                'callableIsTargetRevoked',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableWarn
            instrumentCallableWrapper(
                (...args: Parameters<typeof console.warn>): void => {
                    for (let i = 0, { length } = args; i < length; i += 1) {
                        args[i] = getLocalValue(args[i]);
                    }
                    try {
                        ReflectApply(consoleWarnRef, consoleRef, args);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                },
                'callableWarn',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableBatchGetAndHasToStringSymbolTag
            instrumentCallableWrapper(
                (
                    targetPointer: Pointer,
                    targetTraits: TargetTraits,
                    key: string | symbol,
                    receiverPointerOrPrimitive: PointerOrPrimitive
                ): PointerOrPrimitive => {
                    targetPointer();
                    const target = getSelectedTarget();
                    const receiver = getLocalValue(receiverPointerOrPrimitive);
                    let result;
                    try {
                        result = getTransferableValue(ReflectGet(target, key, receiver));
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                    if (
                        result === undefined &&
                        key === TO_STRING_TAG_SYMBOL &&
                        targetTraits & TargetTraits.IsObject
                    ) {
                        try {
                            if (!ReflectHas(target, key)) {
                                result = LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                            }
                        } catch (e: any) {
                            throw pushErrorAcrossBoundary(e);
                        }
                    }
                    return result;
                },
                'callableBatchGetAndHasToStringSymbolTag',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableBatchGetPrototypeOfAndOwnPropertyDescriptors
            instrumentCallableWrapper(
                (
                    targetPointer: Pointer,
                    foreignCallableDescriptorsCallback: CallableDescriptorsCallback
                ): PointerOrPrimitive => {
                    targetPointer();
                    const target = getSelectedTarget();
                    let unsafeDescMap;
                    try {
                        unsafeDescMap = ObjectGetOwnPropertyDescriptors(target);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                    const ownKeys = ReflectOwnKeys(unsafeDescMap);
                    const { length } = ownKeys;
                    const descriptorTuples: any = new ArrayCtor(length * 7);
                    // prettier-ignore
                    for (let i = 0, j = 0; i < length; i += 1, j += 7) {
                        const ownKey = ownKeys[i];
                        const unsafeDesc = (unsafeDescMap as any)[ownKey];
                        const safeDesc = toSafeDescriptor(unsafeDesc);
                        const { configurable, enumerable, writable, value, get, set } = safeDesc;
                        descriptorTuples[j] = ownKey;
                        descriptorTuples[j + 1] =
                            'configurable' in safeDesc
                                ? !!configurable
                                : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                        descriptorTuples[j + 2] =
                            'enumerable' in safeDesc
                                ? !!enumerable
                                : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                        descriptorTuples[j + 3] =
                            'writable' in safeDesc
                                ? !!writable
                                : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                        descriptorTuples[j + 4] =
                            'value' in safeDesc
                                ? getTransferableValue(value)
                                : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                        descriptorTuples[j + 5] =
                            'get' in safeDesc
                                ? getTransferableValue(get)
                                : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                        descriptorTuples[j + 6] =
                            'set' in safeDesc
                                ? getTransferableValue(set)
                                : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                    }
                    ReflectApply(
                        foreignCallableDescriptorsCallback,
                        undefined,
                        descriptorTuples as Parameters<CallableDescriptorsCallback>
                    );
                    let proto;
                    try {
                        proto = ReflectGetPrototypeOf(target);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                    return proto ? getTransferablePointer(proto) : proto;
                },
                'callableGetOwnPropertyDescriptors',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableBatchGetPrototypeOfWhenHasNoOwnProperty
            instrumentCallableWrapper(
                (targetPointer: Pointer, key: string | symbol): PointerOrPrimitive => {
                    targetPointer();
                    const target = getSelectedTarget();
                    let result;
                    try {
                        result = ReflectApply(ObjectProtoHasOwnProperty, target, [key]);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                    if (result) {
                        return result;
                    }
                    let proto;
                    try {
                        proto = ReflectGetPrototypeOf(target);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                    return proto ? getTransferablePointer(proto) : proto;
                },
                'callableBatchGetPrototypeOfWhenHasNoOwnProperty',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor
            instrumentCallableWrapper(
                (
                    targetPointer: Pointer,
                    key: string | symbol,
                    foreignCallableDescriptorCallback: CallableDescriptorCallback
                ): PointerOrPrimitive => {
                    targetPointer();
                    const target = getSelectedTarget();
                    let unsafeDesc;
                    try {
                        unsafeDesc = ReflectGetOwnPropertyDescriptor(target, key);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                    if (unsafeDesc) {
                        const descMeta = getDescriptorMeta(unsafeDesc);
                        foreignCallableDescriptorCallback(
                            descMeta[0], // configurable
                            descMeta[1], // enumerable
                            descMeta[2], // writable
                            descMeta[3], // valuePointer
                            descMeta[4], // getPointer
                            descMeta[5] // setPointer
                        );
                        return undefined;
                    }
                    let proto;
                    try {
                        proto = ReflectGetPrototypeOf(target);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                    return proto ? getTransferablePointer(proto) : proto;
                },
                'callableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor',
                INBOUND_INSTRUMENTATION_LABEL
            )
        );
        return (...hooks: Parameters<HooksCallback>) => {
            const {
                // 0: globalThisPointer,
                // 1: getSelectedTarget,
                // 2: getTransferableValue,
                // 3: callableGetPropertyValuePointer,
                // 4: callableEvaluate,
                // 5: callableLinkPointers,
                6: callablePushTarget,
                7: callableApply,
                8: callableConstruct,
                9: callableDefineProperty,
                10: callableDeleteProperty,
                11: callableGetOwnPropertyDescriptor,
                12: callableGetPrototypeOf,
                13: callableHas,
                14: callableIsExtensible,
                15: callableOwnKeys,
                16: callablePreventExtensions,
                17: callableSet,
                18: callableSetPrototypeOf,
                19: callableGetSerializedValueOfTarget,
                20: callableGetTargetIntegrityTraits,
                21: callableGetToStringTagOfTarget,
                22: callableIsTargetLive,
                23: callableIsTargetRevoked,
                24: callableWarn,
                25: callableBatchGetAndHasToStringSymbolTag,
                26: callableBatchGetPrototypeOfAndOwnPropertyDescriptors,
                27: callableBatchGetPrototypeOfWhenHasNoOwnProperty,
                28: callableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor,
            } = hooks;
            foreignCallablePushTarget = callablePushTarget;
            // traps utilities
            foreignCallableApply = foreignErrorControl(
                instrumentCallableWrapper(
                    callableApply,
                    'callableApply',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableConstruct = foreignErrorControl(
                instrumentCallableWrapper(
                    callableConstruct,
                    'callableConstruct',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableDefineProperty = foreignErrorControl(
                instrumentCallableWrapper(
                    callableDefineProperty,
                    'callableDefineProperty',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableDeleteProperty = foreignErrorControl(
                instrumentCallableWrapper(
                    callableDeleteProperty,
                    'callableDeleteProperty',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableGetOwnPropertyDescriptor = foreignErrorControl(
                instrumentCallableWrapper(
                    callableGetOwnPropertyDescriptor,
                    'callableGetOwnPropertyDescriptor',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableGetPrototypeOf = foreignErrorControl(
                instrumentCallableWrapper(
                    callableGetPrototypeOf,
                    'callableGetPrototypeOf',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableHas = foreignErrorControl(
                instrumentCallableWrapper(
                    callableHas,
                    'callableHas',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableIsExtensible = foreignErrorControl(
                instrumentCallableWrapper(
                    callableIsExtensible,
                    'callableIsExtensible',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableOwnKeys = foreignErrorControl(
                instrumentCallableWrapper(
                    callableOwnKeys,
                    'callableOwnKeys',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallablePreventExtensions = foreignErrorControl(
                instrumentCallableWrapper(
                    callablePreventExtensions,
                    'callablePreventExtensions',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableSet = foreignErrorControl(
                instrumentCallableWrapper(
                    callableSet,
                    'callableSet',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableSetPrototypeOf = foreignErrorControl(
                instrumentCallableWrapper(
                    callableSetPrototypeOf,
                    'callableSetPrototypeOf',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableGetSerializedValueOfTarget = foreignErrorControl(
                instrumentCallableWrapper(
                    callableGetSerializedValueOfTarget,
                    'callableGetSerializedValueOfTarget',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableGetTargetIntegrityTraits = foreignErrorControl(
                instrumentCallableWrapper(
                    callableGetTargetIntegrityTraits,
                    'callableGetTargetIntegrityTraits',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableGetToStringTagOfTarget = foreignErrorControl(
                instrumentCallableWrapper(
                    callableGetToStringTagOfTarget,
                    'callableGetToStringTagOfTarget',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableIsTargetLive = foreignErrorControl(
                instrumentCallableWrapper(
                    callableIsTargetLive,
                    'callableIsTargetLive',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableIsTargetRevoked = foreignErrorControl(
                instrumentCallableWrapper(
                    callableIsTargetRevoked,
                    'callableIsTargetRevoked',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableWarn = foreignErrorControl(
                instrumentCallableWrapper(
                    callableWarn,
                    'callableWarn',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableBatchGetAndHasToStringSymbolTag = foreignErrorControl(
                instrumentCallableWrapper(
                    callableBatchGetAndHasToStringSymbolTag,
                    'callableBatchGetAndHasToStringSymbolTag',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableBatchGetPrototypeOfAndOwnPropertyDescriptors = foreignErrorControl(
                instrumentCallableWrapper(
                    callableBatchGetPrototypeOfAndOwnPropertyDescriptors,
                    'callableBatchGetPrototypeOfAndOwnPropertyDescriptors',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableBatchGetPrototypeOfWhenHasNoOwnProperty = foreignErrorControl(
                instrumentCallableWrapper(
                    callableBatchGetPrototypeOfWhenHasNoOwnProperty,
                    'callableBatchGetPrototypeOfWhenHasNoOwnProperty',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor = foreignErrorControl(
                instrumentCallableWrapper(
                    callableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor,
                    'callableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
        };
    };
}
