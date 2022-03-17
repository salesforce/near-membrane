/**
 * This file contains an exportable (portable) function `init()` used to initialize
 * one side of a membrane on any realm. The only prerequisite is the ability to
 * evaluate the sourceText of the `init()` function there. Once evaluated, the
 * function will return a set of values that can be used to wire up the side of
 * the membrane with another existing `init()` function from another realm, in
 * which case they will exchange callable functions that are required to connect
 * the two realms via the membrane.
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
 *    it via `selectedTarget!`.
 */

import { InstrumentationHooks } from './instrumentation';

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
type CallableGet = (
    targetPointer: Pointer,
    targetTraits: number,
    key: string | symbol,
    receiver: PointerOrPrimitive
) => PointerOrPrimitive;
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
type CallableDebugInfo = (...args: Parameters<typeof console.info>) => boolean;
type CallableGetTargetIntegrityTraits = (targetPointer: Pointer) => number;
type CallableGetToStringTagOfTarget = (targetPointer: Pointer) => string;
type CallableInstallErrorPrepareStackTrace = () => void;
type CallableIsTargetLive = (targetPointer: Pointer) => boolean;
type CallableIsTargetRevoked = (targetPointer: Pointer) => boolean;
type CallableSerializeTarget = (targetPointer: Pointer) => SerializedValue | undefined;
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
export type CallableInstallLazyDescriptors = (
    targetPointer: Pointer,
    ...ownKeysAndUnforgeableGlobalThisKeys: (string | symbol)[]
) => void;
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
    callableGet: CallableGet,
    callableGetOwnPropertyDescriptor: CallableGetOwnPropertyDescriptor,
    callableGetPrototypeOf: CallableGetPrototypeOf,
    callableHas: CallableHas,
    callableIsExtensible: CallableIsExtensible,
    callableOwnKeys: CallableOwnKeys,
    callablePreventExtensions: CallablePreventExtensions,
    callableSet: CallableSet,
    callableSetPrototypeOf: CallableSetPrototypeOf,
    callableDebugInfo: CallableDebugInfo,
    callableGetTargetIntegrityTraits: CallableGetTargetIntegrityTraits,
    callableGetToStringTagOfTarget: CallableGetToStringTagOfTarget,
    callableInstallErrorPrepareStackTrace: CallableInstallErrorPrepareStackTrace,
    callableInstallLazyDescriptors: CallableInstallLazyDescriptors,
    callableIsTargetLive: CallableIsTargetLive,
    callableIsTargetRevoked: CallableIsTargetRevoked,
    callableSerializeTarget: CallableSerializeTarget,
    callableBatchGetPrototypeOfAndOwnPropertyDescriptors: CallableBatchGetPrototypeOfAndOwnPropertyDescriptors,
    callableBatchGetPrototypeOfWhenHasNoOwnProperty: CallableBatchGetPrototypeOfWhenHasNoOwnProperty,
    callableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor: CallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor
) => void;
export interface HooksOptions {
    distortionCallback?: DistortionCallback;
    instrumentation?: InstrumentationHooks;
}
export type Pointer = CallableFunction;
export type ProxyTarget = CallableFunction | any[] | object;

export const sharedMembraneState = {
    proxyTargetToLazyPropertyStateMap: new WeakMap(),
};
// istanbul ignore next
export function createMembraneMarshall(
    isInShadowRealm?: boolean,
    { proxyTargetToLazyPropertyStateMap } = sharedMembraneState
) {
    const ArrayCtor = Array;
    const ArrayBufferCtor = ArrayBuffer;
    const ErrorCtor = Error;
    const ObjectCtor = Object;
    const ProxyCtor = Proxy;
    const ReflectRef = Reflect;
    const SymbolCtor = Symbol;
    const TypeErrorCtor = TypeError;
    const WeakMapCtor = WeakMap;
    const { for: SymbolFor, toStringTag: TO_STRING_TAG_SYMBOL } = SymbolCtor;
    /* eslint-disable prefer-object-spread */
    // @rollup/plugin-replace replaces `DEV_MODE` references.
    const DEV_MODE = true;
    const FLAGS_REG_EXP = /\w*$/;
    const LOCKER_DEBUG_MODE_SYMBOL = Symbol.for('@@lockerDebugMode');
    const LOCKER_IDENTIFIER_MARKER = '$LWS';
    const LOCKER_LIVE_VALUE_MARKER_SYMBOL = SymbolFor('@@lockerLiveValue');
    const LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL = SymbolFor(
        '@@lockerNearMembraneSerializedValue'
    );
    const LOCKER_NEAR_MEMBRANE_SYMBOL = SymbolFor('@@lockerNearMembrane');
    const LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL = SymbolFor(
        '@@lockerNearMembraneUndefinedValue'
    );
    // The default stack trace limit in Chrome is 10.
    // Set to 20 to account for stack trace filtering.
    const LOCKER_STACK_TRACE_LIMIT = 20;
    // This package is bundled by third-parties that have their own build time
    // replacement logic. Instead of customizing each build system to be aware
    // of this package we implement a two phase debug mode by performing small
    // runtime checks to determine phase one, our code is unminified, and
    // phase two, the user opted-in to custom devtools formatters. Phase one
    // is used for light weight initialization time debug while phase two is
    // reserved for post initialization runtime.
    const LOCKER_UNMINIFIED_FLAG = `${() => /* $LWS */ 1}`.includes('*');
    // Lazily define debug mode phase two in
    // `BoundaryProxyHandler.prototype.makeProxyStatic()`.
    let LOCKER_DEBUG_MODE_FLAG: boolean | undefined = LOCKER_UNMINIFIED_FLAG && undefined;
    // BigInt is not supported in Safari 13.1.
    // https://caniuse.com/bigint
    const SUPPORTS_BIG_INT = typeof BigInt === 'function';
    const {
        assign: ObjectAssign,
        defineProperties: ObjectDefineProperties,
        freeze: ObjectFreeze,
        getOwnPropertyDescriptor: ObjectGetOwnPropertyDescriptor,
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
        __defineSetter__: ObjectProto__defineSetter__,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        __lookupGetter__: ObjectProto__lookupGetter__,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        __lookupSetter__: ObjectProto__lookupSetter__,
        hasOwnProperty: ObjectProtoHasOwnProperty,
        propertyIsEnumerable: ObjectProtoPropertyIsEnumerable,
        toString: ObjectProtoToString,
    } = ObjectProto as any;
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
    } = ReflectRef;
    const { isArray: isArrayOrThrowForRevoked } = ArrayCtor;
    const {
        includes: ArrayProtoIncludes,
        indexOf: ArrayProtoIndexOf,
        slice: ArrayProtoSlice,
    } = ArrayCtor.prototype;
    const { isView: ArrayBufferIsView } = ArrayBufferCtor;
    const ArrayBufferProtoByteLengthGetter = ReflectApply(
        ObjectProto__lookupGetter__,
        ArrayBufferCtor.prototype,
        ['byteLength']
    )!;
    const BigIntProtoValueOf = SUPPORTS_BIG_INT ? BigInt.prototype.valueOf : undefined;
    const { valueOf: BooleanProtoValueOf } = Boolean.prototype;
    const { toString: ErrorProtoToString } = ErrorCtor.prototype;
    const { bind: FunctionProtoBind } = Function.prototype;
    const { stringify: JSONStringify } = JSON;
    const { valueOf: NumberProtoValueOf } = Number.prototype;
    const { revocable: ProxyRevocable } = ProxyCtor;
    const { prototype: RegExpProto } = RegExp;
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
    const {
        endsWith: StringProtoEndsWith,
        includes: StringProtoIncludes,
        slice: StringProtoSlice,
        valueOf: StringProtoValueOf,
    } = String.prototype;
    const { valueOf: SymbolProtoValueOf } = SymbolCtor.prototype;
    const { get: WeakMapProtoGet, set: WeakMapProtoSet } = WeakMapCtor.prototype;
    const consoleRef = console;
    const { info: consoleInfoRef } = consoleRef;
    const localEval = eval;
    const globalThisRef =
        // Support for globalThis was added in Chrome 71.
        (typeof globalThis !== 'undefined' && globalThis) ||
        // However, environments like Android emulators are running Chrome 69.
        // eslint-disable-next-line no-restricted-globals
        (typeof self !== 'undefined' && self) ||
        // See https://mathiasbynens.be/notes/globalthis for more details.
        (ReflectDefineProperty(ObjectProto, 'globalThis', {
            // @ts-ignore: TS doesn't like __proto__ on property descriptors.
            __proto__: null,
            configurable: true,
            get() {
                ReflectDeleteProperty(ObjectProto, 'globalThis');
                // Safari 12 on iOS 12.1 has a `this` of `undefined` so we
                // fallback to `self`.
                // eslint-disable-next-line no-restricted-globals
                return this || self;
            },
        }),
        globalThis);
    // Install flags to ensure things are installed once per realm.
    let installedErrorPrepareStackTraceFlag = false;
    let installedPropertyDescriptorMethodWrappersFlag = false;
    // Lazily populated in `getUnforgeableGlobalThisGetter()`;
    const keyToGlobalThisGetterRegistry = { __proto__: null };
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

    function createUnforgeableGlobalThisDescriptor(
        target: object,
        key: string | symbol
    ): PropertyDescriptor {
        return {
            configurable: false,
            enumerable: ReflectApply(ObjectProtoPropertyIsEnumerable, target, [key]),
            get: getUnforgeableGlobalThisGetter(key),
            set: undefined,
        };
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
        // https://tc39.github.io/ecma262/#sec-object.prototype.tostring
        // Step 16: If `Type(tag)` is not `String`, let `tag` be `builtinTag`.
        const brand = ReflectApply(ObjectProtoToString, target, []);
        return ReflectApply(StringProtoSlice, brand, [8, -1]);
    }

    function getUnforgeableGlobalThisGetter(key: string | symbol): () => typeof globalThis {
        let globalThisGetter = keyToGlobalThisGetterRegistry[key];
        if (globalThisGetter === undefined) {
            // Preserve identity continuity of getters.
            globalThisGetter = ReflectApply(FunctionProtoBind, () => globalThisRef, []);
            keyToGlobalThisGetterRegistry[key] = globalThisGetter;
        }
        return globalThisGetter;
    }

    function installPropertyDescriptorMethodWrappers(
        unforgeableGlobalThisKeys?: (string | symbol)[]
    ) {
        if (installedPropertyDescriptorMethodWrappersFlag) {
            return;
        }
        installedPropertyDescriptorMethodWrappersFlag = true;
        // We wrap property descriptor methods to activate lazy descriptors
        // and/or workaround browser bugs. The following methods are wrapped:
        //   Object.getOwnPropertyDescriptors()
        //   Object.getOwnPropertyDescriptor()
        //   Reflect.defineProperty()
        //   Reflect.getOwnPropertyDescriptor()
        //   Object.prototype.__defineGetter__()
        //   Object.prototype.__defineSetter__()
        //   Object.prototype.__lookupGetter__()
        //   Object.prototype.__lookupSetter__()
        //
        // Chromium based browsers have a bug that nulls the result of `window`
        // getters in detached iframes when the property descriptor of `window.window`
        // is retrieved.
        // https://bugs.chromium.org/p/chromium/issues/detail?id=1305302
        //
        // Methods may be poisoned when they interact with the `window` object
        // and retrieve property descriptors, like 'window', that contain the
        // `window` object itself. The following built-in methods are susceptible
        // to this issue:
        //     console.log(window);
        //     Object.getOwnPropertyDescriptors(window);
        //     Object.getOwnPropertyDescriptor(window, 'window');
        //     Reflect.getOwnPropertyDescriptor(window, 'window');
        //     window.__lookupGetter__('window');
        //     window.__lookupSetter__('window');
        //
        // We side step issues with `console` by mapping it to the the blue
        // realm's `console`. Since we're already wrapping property descriptor methods
        // methods to activate lazy descriptors we use the wrapper to workaround
        // the `window` getter nulling bug.
        const shouldFixChromeBug =
            isArrayOrThrowForRevoked(unforgeableGlobalThisKeys) &&
            unforgeableGlobalThisKeys.length > 0;

        const getFixedDescriptor = shouldFixChromeBug
            ? (target: any, key: string | symbol): PropertyDescriptor | undefined =>
                  ReflectApply(ArrayProtoIncludes, unforgeableGlobalThisKeys, [key])
                      ? createUnforgeableGlobalThisDescriptor(target, key)
                      : ReflectGetOwnPropertyDescriptor(target, key)
            : undefined;

        const lookupFixedGetter = shouldFixChromeBug
            ? (target: any, key: string | symbol): (() => any | undefined) =>
                  ReflectApply(ArrayProtoIncludes, unforgeableGlobalThisKeys, [key])
                      ? getUnforgeableGlobalThisGetter(key)
                      : ReflectApply(ObjectProto__lookupGetter__, target, [key])
            : undefined;

        const lookupFixedSetter = shouldFixChromeBug
            ? (target: any, key: string | symbol): (() => any | undefined) =>
                  ReflectApply(ArrayProtoIncludes, unforgeableGlobalThisKeys, [key])
                      ? undefined
                      : ReflectApply(ObjectProto__lookupSetter__, target, [key])
            : undefined;

        const wrapDefineAccessOrProperty = (originalFunc: Function) => {
            const { length: originalFuncLength } = originalFunc;
            // `__defineGetter__()` and `__defineSetter__()` have function
            // lengths of 2 while `Reflect.defineProperty()` has a function
            // length of 3.
            const useThisArgAsTarget = originalFuncLength === 2;
            return new ProxyCtor(originalFunc, {
                apply(_originalFunc: Function, thisArg: any, args: any[]) {
                    if (args.length >= originalFuncLength) {
                        const target = useThisArgAsTarget ? thisArg : args[0];
                        const key = useThisArgAsTarget ? args[0] : args[1];
                        const lazyState = ReflectApply(
                            WeakMapProtoGet,
                            proxyTargetToLazyPropertyStateMap,
                            [target]
                        );
                        if (lazyState?.[key]) {
                            // Activate the descriptor by triggering its getter.
                            ReflectGet(target, key);
                        }
                    }
                    return ReflectApply(originalFunc, thisArg, args);
                },
            });
        };

        const wrapLookupAccessor = (
            originalFunc: typeof ObjectProto__lookupGetter__,
            lookupFixedAccessor?: typeof lookupFixedGetter
        ) =>
            new ProxyCtor(originalFunc, {
                apply(_originalFunc: Function, thisArg: any, args: [key: string | symbol]) {
                    if (args.length) {
                        const { 0: key } = args;
                        const lazyState = ReflectApply(
                            WeakMapProtoGet,
                            proxyTargetToLazyPropertyStateMap,
                            [thisArg]
                        );
                        if (lazyState?.[key]) {
                            // Activate the descriptor by triggering its getter.
                            ReflectGet(thisArg, key);
                        }
                        if (shouldFixChromeBug && thisArg === globalThisRef) {
                            return lookupFixedAccessor!(thisArg, key);
                        }
                    }
                    return ReflectApply(originalFunc, thisArg, args);
                },
            }) as typeof Reflect.getOwnPropertyDescriptor;

        const wrapGetOwnPropertyDescriptor = (
            originalFunc: typeof Reflect.getOwnPropertyDescriptor
        ) =>
            new ProxyCtor(originalFunc, {
                apply(
                    _originalFunc: Function,
                    thisArg: any,
                    args: [target: object, key: string | symbol]
                ) {
                    if (args.length > 1) {
                        const { 0: target, 1: key } = args;
                        const lazyState = ReflectApply(
                            WeakMapProtoGet,
                            proxyTargetToLazyPropertyStateMap,
                            [target]
                        );
                        if (lazyState?.[key]) {
                            // Activate the descriptor by triggering its getter.
                            ReflectGet(target, key);
                        }
                        if (shouldFixChromeBug && target === globalThisRef) {
                            return getFixedDescriptor!(target, key);
                        }
                    }
                    return ReflectApply(originalFunc, thisArg, args);
                },
            }) as typeof Reflect.getOwnPropertyDescriptor;

        const wrapGetOwnPropertyDescriptors = (
            originalFunc: typeof Object.getOwnPropertyDescriptors
        ) =>
            new ProxyCtor(originalFunc, {
                apply(
                    _originalFunc: Function,
                    thisArg: any,
                    args: Parameters<typeof Object.getOwnPropertyDescriptors>
                ) {
                    if (!args.length) {
                        // Defer to native method to throw exception.
                        return ReflectApply(originalFunc, thisArg, args);
                    }
                    const { 0: target } = args as any[];
                    const lazyState = ReflectApply(
                        WeakMapProtoGet,
                        proxyTargetToLazyPropertyStateMap,
                        [target]
                    );
                    const isFixingChromeBug = target === globalThisRef && shouldFixChromeBug;
                    const unsafeDescMap = isFixingChromeBug
                        ? // Create an empty property descriptor map to populate
                          // with curated descriptors.
                          ({} as PropertyDescriptorMap)
                        : // Since this is not a global object it is safe to
                          // use the native method.
                          ReflectApply(originalFunc, thisArg, args);
                    if (!isFixingChromeBug && lazyState === undefined) {
                        // Exit early if the target is not a global object and
                        // there are no lazy descriptors.
                        return unsafeDescMap;
                    }
                    const ownKeys = ReflectOwnKeys(isFixingChromeBug ? target : unsafeDescMap);
                    for (let i = 0, { length } = ownKeys; i < length; i += 1) {
                        const ownKey = ownKeys[i];
                        const isLazyProp = !!lazyState?.[ownKey];
                        if (isLazyProp) {
                            // Activate the descriptor by triggering its getter.
                            ReflectGet(target, ownKey);
                        }
                        if (isLazyProp || isFixingChromeBug) {
                            const unsafeDesc = isFixingChromeBug
                                ? getFixedDescriptor!(target, ownKey)
                                : ReflectGetOwnPropertyDescriptor(target, ownKey);
                            // Update the descriptor map entry.
                            if (unsafeDesc) {
                                unsafeDescMap[ownKey] = unsafeDesc;
                            } else if (!isFixingChromeBug) {
                                delete unsafeDescMap[ownKey];
                            }
                        }
                    }
                    return unsafeDescMap;
                },
            }) as typeof Object.getOwnPropertyDescriptors;

        ReflectRef.defineProperty = wrapDefineAccessOrProperty(
            ReflectDefineProperty
        ) as typeof Reflect.defineProperty;
        ReflectRef.getOwnPropertyDescriptor = wrapGetOwnPropertyDescriptor(
            ReflectGetOwnPropertyDescriptor
        );
        ObjectCtor.getOwnPropertyDescriptor = wrapGetOwnPropertyDescriptor(
            ObjectGetOwnPropertyDescriptor
        );
        ObjectCtor.getOwnPropertyDescriptors = wrapGetOwnPropertyDescriptors(
            ObjectGetOwnPropertyDescriptors
        );
        // eslint-disable-next-line @typescript-eslint/naming-convention, no-restricted-properties, no-underscore-dangle
        (ObjectProto as any).__defineGetter__ = wrapDefineAccessOrProperty(
            ObjectProto__defineGetter__
        );
        // eslint-disable-next-line @typescript-eslint/naming-convention, no-restricted-properties, no-underscore-dangle
        (ObjectProto as any).__defineSetter__ = wrapDefineAccessOrProperty(
            ObjectProto__defineSetter__
        );
        // eslint-disable-next-line @typescript-eslint/naming-convention, no-underscore-dangle
        (ObjectProto as any).__lookupGetter__ = wrapLookupAccessor(
            ObjectProto__lookupGetter__,
            lookupFixedGetter
        );
        // eslint-disable-next-line @typescript-eslint/naming-convention, no-underscore-dangle
        (ObjectProto as any).__lookupSetter__ = wrapLookupAccessor(
            ObjectProto__lookupSetter__,
            lookupFixedSetter
        );
    }

    function installErrorPrepareStackTrace() {
        if (installedErrorPrepareStackTraceFlag) {
            return;
        }
        installedErrorPrepareStackTraceFlag = true;
        // Feature detect the V8 stack trace API.
        // https://v8.dev/docs/stack-trace-api
        const CallSite = ((): Function | undefined => {
            ErrorCtor.prepareStackTrace = (_error: Error, callSites: NodeJS.CallSite[]) =>
                callSites;
            const callSites = new ErrorCtor().stack as string | NodeJS.CallSite[];
            delete ErrorCtor.prepareStackTrace;
            return isArrayOrThrowForRevoked(callSites) && callSites.length > 0
                ? callSites[0]?.constructor
                : undefined;
        })();
        if (typeof CallSite !== 'function') {
            return;
        }
        const {
            getEvalOrigin: CallSiteProtoGetEvalOrigin,
            getFunctionName: CallSiteProtoGetFunctionName,
            toString: CallSiteProtoToString,
        } = CallSite.prototype;

        const formatStackTrace = function formatStackTrace(
            error: Error,
            callSites: NodeJS.CallSite[]
        ): string {
            // Based on V8's default stack trace formatting:
            // https://chromium.googlesource.com/v8/v8.git/+/refs/heads/main/src/execution/messages.cc#371
            let stackTrace = '';
            try {
                stackTrace = ReflectApply(ErrorProtoToString, error, []);
            } catch {
                stackTrace = '<error>';
            }
            let consecutive = false;
            for (let i = 0, { length } = callSites; i < length; i += 1) {
                const callSite = callSites[i];
                const funcName = ReflectApply(CallSiteProtoGetFunctionName, callSite, []);
                let isMarked = false;
                if (
                    typeof funcName === 'string' &&
                    funcName !== 'eval' &&
                    ReflectApply(StringProtoEndsWith, funcName, [LOCKER_IDENTIFIER_MARKER])
                ) {
                    isMarked = true;
                }
                if (!isMarked) {
                    const evalOrigin = ReflectApply(CallSiteProtoGetEvalOrigin, callSite, []);
                    if (
                        typeof evalOrigin === 'string' &&
                        ReflectApply(StringProtoIncludes, evalOrigin, [LOCKER_IDENTIFIER_MARKER])
                    ) {
                        isMarked = true;
                    }
                }
                // Only write a single LWS entry per consecutive LWS stacks.
                if (isMarked) {
                    if (!consecutive) {
                        consecutive = true;
                        stackTrace += '\n    at LWS';
                    }
                    continue;
                } else {
                    consecutive = false;
                }
                try {
                    stackTrace += `\n    at ${ReflectApply(CallSiteProtoToString, callSite, [])}`;
                    // eslint-disable-next-line no-empty
                } catch {}
            }
            return stackTrace;
        };
        // Error.prepareStackTrace cannot be a bound or proxy wrapped
        // function, so to obscure its source we wrap the call to
        // formatStackTrace().
        ErrorCtor.prepareStackTrace = function prepareStackTrace(
            error: Error,
            callSites: NodeJS.CallSite[]
        ) {
            return formatStackTrace(error, callSites);
        };
        const { stackTraceLimit } = ErrorCtor;
        if (typeof stackTraceLimit !== 'number' || stackTraceLimit < LOCKER_STACK_TRACE_LIMIT) {
            ErrorCtor.stackTraceLimit = LOCKER_STACK_TRACE_LIMIT;
        }
    }

    function isArrayBuffer(value: any): boolean {
        try {
            // Section 25.1.5.1 get ArrayBuffer.prototype.byteLength
            // https://tc39.es/ecma262/#sec-get-arraybuffer.prototype.bytelength
            // Step 2: Perform ? RequireInternalSlot(O, [[ArrayBufferData]]).
            ReflectApply(ArrayBufferProtoByteLengthGetter, value, []);
            return true;
            // eslint-disable-next-line no-empty
        } catch {}
        return false;
    }

    function isRegExp(value: any): boolean {
        try {
            // Section 25.1.5.1 get ArrayBuffer.prototype.byteLength
            // https://tc39.es/ecma262/#sec-get-regexp.prototype.source
            // Step 3: If R does not have an [[OriginalSource]] internal slot, then
            //     a. If SameValue(R, %RegExp.prototype%) is true, return "(?:)".
            //     b. Otherwise, throw a TypeError exception.
            if (value !== RegExpProto) {
                ReflectApply(RegExpProtoSourceGetter, value, []);
                return true;
            }
            // eslint-disable-next-line no-empty
        } catch {}
        return false;
    }

    function isTargetLive(target: ProxyTarget): boolean {
        if (target === ObjectProto) {
            return false;
        }
        if (typeof target === 'object') {
            const { constructor } = target;
            if (constructor === ObjectCtor) {
                // If the constructor, own or inherited, points to `Object`
                // then `value` is not likely a prototype object.
                return true;
            }
            let result = false;
            if (ReflectGetPrototypeOf(target) === null) {
                // Ensure `value` is not an `Object.prototype` from an iframe.
                result = typeof constructor !== 'function' || constructor.prototype !== target;
            }
            if (!result) {
                // We only check for typed arrays, array buffers, and regexp here
                // since plain arrays are marked as live in the BoundaryProxyHandler
                // constructor.
                result = ArrayBufferIsView(target) || isArrayBuffer(target) || isRegExp(target);
            }
            if (result) {
                return result;
            }
        }
        return ReflectApply(ObjectProtoHasOwnProperty, target, [LOCKER_LIVE_VALUE_MARKER_SYMBOL]);
    }

    function isTargetRevoked(target: ProxyTarget): boolean {
        try {
            isArrayOrThrowForRevoked(target);
            return false;
            //  eslint-disable-next-line no-empty
        } catch {}
        return true;
    }

    function serializeBigIntObject(bigIntObject: BigInt): bigint {
        // Section 21.2.3 Properties of the BigInt Prototype Object
        // https://tc39.es/ecma262/#thisbigintvalue
        // Step 2: If Type(value) is Object and value has a [[BigIntData]] internal slot, then
        //     a. Assert: Type(value.[[BigIntData]]) is BigInt.
        return ReflectApply(BigIntProtoValueOf!, bigIntObject, []);
    }

    function serializeBooleanObject(booleanObject: Boolean): boolean {
        // Section 20.3.3 Properties of the Boolean Prototype Object
        // https://tc39.es/ecma262/#thisbooleanvalue
        // Step 2: If Type(value) is Object and value has a [[BooleanData]] internal slot, then
        //     a. Let b be value.[[BooleanData]].
        //     b. Assert: Type(b) is Boolean.
        return ReflectApply(BooleanProtoValueOf, booleanObject, []);
    }

    function serializeNumberObject(numberObject: Number): number {
        // 21.1.3 Properties of the Number Prototype Object
        // https://tc39.es/ecma262/#thisnumbervalue
        // Step 2: If Type(value) is Object and value has a [[NumberData]] internal slot, then
        //     a. Let n be value.[[NumberData]].
        //     b. Assert: Type(n) is Number.
        return ReflectApply(NumberProtoValueOf, numberObject, []);
    }

    function serializeRegExp(value: any): string | undefined {
        // 22.2.5.12 get RegExp.prototype.source
        // https://tc39.es/ecma262/#sec-get-regexp.prototype.source
        // Step 3: If R does not have an [[OriginalSource]] internal slot, then
        //     a. If SameValue(R, %RegExp.prototype%) is true, return "(?:)".
        //     b. Otherwise, throw a TypeError exception.
        if (value !== RegExpProto) {
            const source = ReflectApply(RegExpProtoSourceGetter, value, []);
            return JSONStringify({
                __proto__: null,
                flags: ReflectApply(RegExpProtoFlagsGetter, value, []),
                source,
            });
        }
        return undefined;
    }

    function serializeStringObject(stringObject: String): string {
        // 22.1.3 Properties of the String Prototype Object
        // https://tc39.es/ecma262/#thisstringvalue
        // Step 2: If Type(value) is Object and value has a [[StringData]] internal slot, then
        //     a. Let s be value.[[StringData]].
        //     b. Assert: Type(s) is String.
        return ReflectApply(StringProtoValueOf, stringObject, []);
    }

    function serializeSymbolObject(symbolObject: Symbol): symbol {
        // 20.4.3 Properties of the Symbol Prototype Object
        // https://tc39.es/ecma262/#thissymbolvalue
        // Step 2: If Type(value) is Object and value has a [[SymbolData]] internal slot, then
        //     a. Let s be value.[[SymbolData]].
        //     b. Assert: Type(s) is Symbol.
        return ReflectApply(SymbolProtoValueOf, symbolObject, []);
    }

    function serializeTarget(target: ProxyTarget): SerializedValue | undefined {
        if (!ReflectHas(target, TO_STRING_TAG_SYMBOL)) {
            // Fast path.
            const brand = ReflectApply(ObjectProtoToString, target, []);
            switch (brand) {
                // The brand(s) below represent boxed primitives of `ESGlobalKeys`
                // in packages/near-membrane-base/src/intrinsics.ts which are not
                // remapped or reflective.
                case '[object BigInt]':
                    return SUPPORTS_BIG_INT ? serializeBooleanObject(target as any) : undefined;
                case '[object Boolean]':
                    return serializeBooleanObject(target as any);
                case '[object Number]':
                    return serializeNumberObject(target as any);
                case '[object RegExp]':
                    return serializeRegExp(target as any);
                case '[object String]':
                    return serializeStringObject(target as any);
                case '[object Symbol]':
                    return serializeSymbolObject(target as any);
                default:
                    return undefined;
            }
        }
        try {
            // Symbol.prototype[@@toStringTag] is defined by default so make it
            // the first serialization attempt.
            // https://tc39.es/ecma262/#sec-symbol.prototype-@@tostringtag
            return serializeSymbolObject(target as any);
            // eslint-disable-next-line no-empty
        } catch {}
        if (SUPPORTS_BIG_INT) {
            try {
                return serializeBigIntObject(target as any);
                // eslint-disable-next-line no-empty
            } catch {}
        }
        try {
            return serializeBooleanObject(target as any);
            // eslint-disable-next-line no-empty
        } catch {}
        try {
            return serializeNumberObject(target as any);
            // eslint-disable-next-line no-empty
        } catch {}
        try {
            return serializeRegExp(target as any);
            // eslint-disable-next-line no-empty
        } catch {}
        try {
            return serializeStringObject(target as any);
            // eslint-disable-next-line no-empty
        } catch {}
        return undefined;
    }

    function toSafeDescriptor<T extends PropertyDescriptor>(desc: T): T {
        ReflectSetPrototypeOf(desc, null);
        return desc;
    }

    return function createHooksCallback(
        color: string,
        trapMutations: boolean,
        foreignCallableHooksCallback: HooksCallback,
        providedOptions?: HooksOptions
    ): HooksCallback {
        const {
            distortionCallback = (o: ProxyTarget) => o,
            instrumentation,
            // eslint-disable-next-line prefer-object-spread
        } = ObjectAssign({ __proto__: null }, providedOptions);

        const proxyTargetToPointerMap = new WeakMapCtor();

        let foreignCallablePushTarget: CallablePushTarget;
        let foreignCallableApply: CallableApply;
        let foreignCallableConstruct: CallableConstruct;
        let foreignCallableDefineProperty: CallableDefineProperty;
        let foreignCallableDeleteProperty: CallableDeleteProperty;
        let foreignCallableGet: CallableGet;
        let foreignCallableGetOwnPropertyDescriptor: CallableGetOwnPropertyDescriptor;
        let foreignCallableGetPrototypeOf: CallableGetPrototypeOf;
        let foreignCallableHas: CallableHas;
        let foreignCallableIsExtensible: CallableIsExtensible;
        let foreignCallableOwnKeys: CallableOwnKeys;
        let foreignCallablePreventExtensions: CallablePreventExtensions;
        let foreignCallableSet: CallableSet;
        let foreignCallableSetPrototypeOf: CallableSetPrototypeOf;
        let foreignCallableDebugInfo: CallableDebugInfo;
        let foreignCallableGetTargetIntegrityTraits: CallableGetTargetIntegrityTraits;
        let foreignCallableGetToStringTagOfTarget: CallableGetToStringTagOfTarget;
        let foreignCallableInstallErrorPrepareStackTrace: CallableInstallErrorPrepareStackTrace;
        let foreignCallableIsTargetLive: CallableIsTargetLive;
        let foreignCallableIsTargetRevoked: CallableIsTargetRevoked;
        let foreignCallableSerializeTarget: CallableSerializeTarget;
        let foreignCallableBatchGetPrototypeOfAndOwnPropertyDescriptors: CallableBatchGetPrototypeOfAndOwnPropertyDescriptors;
        let foreignCallableBatchGetPrototypeOfWhenHasNoOwnProperty: CallableBatchGetPrototypeOfWhenHasNoOwnProperty;
        let foreignCallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor: CallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor;

        let lastProxyTrapCalled = ProxyHandlerTraps.None;
        let nearMembraneSymbolFlag = false;
        let selectedTarget: undefined | ProxyTarget;

        function activateLazyOwnPropertyDefinition(
            target: object,
            key: string | symbol,
            lazyState: object
        ) {
            delete lazyState[key];
            const activity = instrumentation
                ? instrumentation.startActivity('callableGetOwnPropertyDescriptor')
                : undefined;
            const foreignTargetPointer = getTransferablePointer(target);
            let safeDesc;
            try {
                foreignCallableGetOwnPropertyDescriptor(
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
                    }
                );
            } catch (error: any) {
                const errorToThrow = selectedTarget ?? error;
                selectedTarget = undefined;
                activity?.error(errorToThrow);
                throw errorToThrow;
            } finally {
                activity?.stop();
            }
            if (safeDesc) {
                ReflectDefineProperty(target, key, safeDesc);
            } else {
                delete target[key];
            }
        }

        function copyForeignOwnPropertyDescriptorsAndPrototypeToShadowTarget(
            foreignTargetPointer: Pointer,
            shadowTarget: ShadowTarget
        ): void {
            const activity = instrumentation
                ? instrumentation.startActivity(
                      'callableBatchGetPrototypeOfAndOwnPropertyDescriptors'
                  )
                : undefined;
            let protoPointerOrNull;
            try {
                protoPointerOrNull = foreignCallableBatchGetPrototypeOfAndOwnPropertyDescriptors(
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
                        // Use `ObjectDefineProperties()` instead of individual
                        // `ReflectDefineProperty()` calls for better performance.
                        ObjectDefineProperties(shadowTarget, descriptors);
                    }
                );
            } catch (error: any) {
                const errorToThrow = selectedTarget ?? error;
                selectedTarget = undefined;
                throw errorToThrow;
            } finally {
                activity?.stop();
            }
            const proto = protoPointerOrNull
                ? (getLocalValue(protoPointerOrNull) as object)
                : (protoPointerOrNull as null);
            ReflectSetPrototypeOf(shadowTarget, proto);
        }

        // The metadata is the transferable descriptor definition.
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

        function createLazyDescriptor(
            target: object,
            key: string | symbol,
            lazyState: object
        ): PropertyDescriptor {
            // The role of this descriptor is to serve as a bouncer. When either
            // a getter or a setter is invoked the descriptor will be replaced
            // with the descriptor from the foreign side and the get/set operation
            // will carry on from there.
            return {
                // @ts-ignore: TS doesn't like __proto__ on property descriptors.
                __proto__: null,
                // We DO explicitly set configurability in the off chance that
                // the property doesn't exist.
                configurable: true,
                // We DON'T explicitly set enumerability to defer to the
                // enumerability of the existing property. In the off chance the
                // the property doesn't exist the property will be defined as
                // non-enumerable.
                get(): any {
                    activateLazyOwnPropertyDefinition(target, key, lazyState);
                    return ReflectGet(target, key);
                },
                set(value: any) {
                    activateLazyOwnPropertyDefinition(target, key, lazyState);
                    ReflectSet(target, key, value);
                },
            };
        }

        function createPointer(originalTarget: ProxyTarget): () => void {
            // assert: originalTarget is a ProxyTarget
            const pointer = (): void => {
                // assert: selectedTarget is undefined
                selectedTarget = originalTarget;
            };
            if (DEV_MODE) {
                // In case debugging is needed, the following lines can help:
                pointer['[[OriginalTarget]]'] = originalTarget;
                pointer['[[Color]]'] = color;
            }
            return pointer;
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
                const localValue = selectedTarget;
                selectedTarget = undefined;
                return localValue;
            }
            return pointerOrPrimitive;
        }

        function getTransferablePointer(originalTarget: ProxyTarget): Pointer {
            let proxyPointer = ReflectApply(WeakMapProtoGet, proxyTargetToPointerMap, [
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
                if (DEV_MODE) {
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

            // The WeakMap is populated with the original target rather then the
            // distorted one while the pointer always uses the distorted one.
            // TODO: This mechanism poses another issue, which is that the return
            // value of selectedTarget! can never be used to call across the
            // membrane because that will cause a wrapping around the potential
            // distorted value instead of the original value. This is not fatal,
            // but implies that for every distorted value where are two proxies
            // that are not ===, which is weird. Guaranteeing this is not easy
            // because it means auditing the code.
            ReflectApply(WeakMapProtoSet, proxyTargetToPointerMap, [originalTarget, proxyPointer]);
            return proxyPointer;
        }

        function getTransferableValue(value: any): PointerOrPrimitive {
            // Internationally ignoring the case of (typeof document.all === 'undefined')
            // because in the reserve membrane, you never get one of those exotic objects.
            if (typeof value === 'undefined') {
                return undefined;
            }
            if (value === null || (typeof value !== 'function' && typeof value !== 'object')) {
                return value;
            }
            return getTransferablePointer(value);
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
            const activity = instrumentation
                ? instrumentation.startActivity(
                      'callableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor'
                  )
                : undefined;
            let protoPointerOrNull;
            let safeDesc;
            try {
                protoPointerOrNull =
                    foreignCallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor(
                        foreignTargetPointer,
                        key,
                        (
                            configurable,
                            enumerable,
                            writable,
                            valuePointer,
                            getPointer,
                            setPointer
                        ) => {
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
            } catch (error: any) {
                const errorToThrow = selectedTarget ?? error;
                selectedTarget = undefined;
                activity?.error(errorToThrow);
                throw errorToThrow;
            } finally {
                activity?.stop();
            }
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

        function pushErrorAcrossBoundary(error: any): any {
            const foreignErrorPointer = getTransferableValue(error);
            if (typeof foreignErrorPointer === 'function') {
                foreignErrorPointer();
            }
            return error;
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

            staticToStringTag: string | undefined;

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
                this.staticToStringTag = undefined;
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
                                    try {
                                        serializedValue = foreignCallableSerializeTarget(
                                            this.foreignTargetPointer
                                        );
                                        // eslint-disable-next-line no-empty
                                    } catch {}
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

            // The apply trap is generic, and should never change independently
            // of the type of membrane.
            readonly apply = function applyTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                thisArg: any,
                args: any[]
            ): any {
                lastProxyTrapCalled = ProxyHandlerTraps.Apply;
                const activity = instrumentation
                    ? instrumentation.startActivity('callableApply')
                    : undefined;
                const { foreignTargetPointer } = this;
                const { length } = args;
                const transferableThisArg = getTransferableValue(thisArg);
                let pointerOrPrimitive: PointerOrPrimitive;
                let result: any;
                if (length === 0) {
                    try {
                        pointerOrPrimitive = foreignCallableApply(
                            foreignTargetPointer,
                            transferableThisArg
                        );
                        // Inline getLocalValue().
                        result = pointerOrPrimitive;
                        if (typeof pointerOrPrimitive === 'function') {
                            pointerOrPrimitive();
                            result = selectedTarget;
                            selectedTarget = undefined;
                        }
                        return result;
                    } catch (error: any) {
                        const errorToThrow = selectedTarget ?? error;
                        selectedTarget = undefined;
                        activity?.error(errorToThrow);
                        throw errorToThrow;
                    } finally {
                        activity?.stop();
                    }
                }
                const combinedArgs = [foreignTargetPointer, transferableThisArg];
                const { length: combinedOffset } = combinedArgs;
                combinedArgs.length += length;
                for (let i = 0; i < length; i += 1) {
                    const arg = args[i];
                    const combinedIndex = i + combinedOffset;
                    // Inlining `getTransferableValue()`.
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
                try {
                    if (length === 1) {
                        pointerOrPrimitive = foreignCallableApply(
                            foreignTargetPointer,
                            transferableThisArg,
                            combinedArgs[2]
                        );
                    } else if (length === 2) {
                        pointerOrPrimitive = foreignCallableApply(
                            foreignTargetPointer,
                            transferableThisArg,
                            combinedArgs[2],
                            combinedArgs[3]
                        );
                    } else if (length === 3) {
                        pointerOrPrimitive = foreignCallableApply(
                            foreignTargetPointer,
                            transferableThisArg,
                            combinedArgs[2],
                            combinedArgs[3],
                            combinedArgs[4]
                        );
                    } else if (length === 4) {
                        pointerOrPrimitive = foreignCallableApply(
                            foreignTargetPointer,
                            transferableThisArg,
                            combinedArgs[2],
                            combinedArgs[3],
                            combinedArgs[4],
                            combinedArgs[5]
                        );
                    } else {
                        pointerOrPrimitive = ReflectApply(
                            foreignCallableApply,
                            undefined,
                            combinedArgs
                        );
                    }
                    // Inline getLocalValue().
                    result = pointerOrPrimitive;
                    if (typeof pointerOrPrimitive === 'function') {
                        pointerOrPrimitive();
                        result = selectedTarget;
                        selectedTarget = undefined;
                    }
                    return result;
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    activity?.error(errorToThrow);
                    throw errorToThrow;
                } finally {
                    activity?.stop();
                }
            };

            // The construct trap is generic, and should never change
            // independently of the type of membrane.
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
                const activity = instrumentation
                    ? instrumentation.startActivity('callableApply')
                    : undefined;
                const { foreignTargetPointer } = this;
                const { length } = args;
                const transferableNewTarget = getTransferableValue(newTarget);
                let pointerOrPrimitive: PointerOrPrimitive;
                let result: any;
                if (length === 0) {
                    try {
                        pointerOrPrimitive = foreignCallableConstruct(
                            foreignTargetPointer,
                            transferableNewTarget
                        );
                        // Inline getLocalValue().
                        result = pointerOrPrimitive;
                        if (typeof pointerOrPrimitive === 'function') {
                            pointerOrPrimitive();
                            result = selectedTarget;
                            selectedTarget = undefined;
                        }
                        return result;
                    } catch (error: any) {
                        const errorToThrow = selectedTarget ?? error;
                        selectedTarget = undefined;
                        activity?.error(errorToThrow);
                        throw errorToThrow;
                    } finally {
                        activity?.stop();
                    }
                }
                const combinedArgs = [foreignTargetPointer, transferableNewTarget];
                const { length: combinedOffset } = combinedArgs;
                combinedArgs.length += length;
                for (let i = 0; i < length; i += 1) {
                    const arg = args[i];
                    const combinedIndex = i + combinedOffset;
                    // Inlining `getTransferableValue()`.
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
                try {
                    if (length === 1) {
                        pointerOrPrimitive = foreignCallableConstruct(
                            foreignTargetPointer,
                            transferableNewTarget,
                            combinedArgs[2]
                        );
                    } else if (length === 2) {
                        pointerOrPrimitive = foreignCallableConstruct(
                            foreignTargetPointer,
                            transferableNewTarget,
                            combinedArgs[2],
                            combinedArgs[3]
                        );
                    } else if (length === 3) {
                        pointerOrPrimitive = foreignCallableConstruct(
                            foreignTargetPointer,
                            transferableNewTarget,
                            combinedArgs[2],
                            combinedArgs[3],
                            combinedArgs[4]
                        );
                    } else if (length === 4) {
                        pointerOrPrimitive = foreignCallableConstruct(
                            foreignTargetPointer,
                            transferableNewTarget,
                            combinedArgs[2],
                            combinedArgs[3],
                            combinedArgs[4],
                            combinedArgs[5]
                        );
                    } else {
                        pointerOrPrimitive = ReflectApply(
                            foreignCallableConstruct,
                            undefined,
                            combinedArgs
                        );
                    }
                    // Inline getLocalValue().
                    result = pointerOrPrimitive;
                    if (typeof pointerOrPrimitive === 'function') {
                        pointerOrPrimitive();
                        result = selectedTarget;
                        selectedTarget = undefined;
                    }
                    return result;
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    activity?.error(errorToThrow);
                    throw errorToThrow;
                } finally {
                    activity?.stop();
                }
            };

            // internal utilities
            private makeProxyLive() {
                // Replace pending traps with live traps that can work with the
                // target without taking snapshots.
                this.deleteProperty = BoundaryProxyHandler.passthruDeletePropertyTrap;
                this.defineProperty = BoundaryProxyHandler.passthruDefinePropertyTrap;
                this.preventExtensions = BoundaryProxyHandler.passthruPreventExtensionsTrap;
                this.set = BoundaryProxyHandler.passthruSetTrap;
                this.setPrototypeOf = BoundaryProxyHandler.passthruSetPrototypeOfTrap;
                // Future optimization: Hoping proxies with frozen handlers can be faster.
                ObjectFreeze(this);
            }

            private makeProxyStatic(shadowTarget: ShadowTarget) {
                const { foreignTargetPointer } = this;
                let targetIntegrityTraits;
                {
                    const activity = instrumentation
                        ? instrumentation.startActivity('callableGetTargetIntegrityTraits')
                        : undefined;
                    try {
                        targetIntegrityTraits =
                            foreignCallableGetTargetIntegrityTraits(foreignTargetPointer);
                        activity?.stop();
                    } catch (error: any) {
                        const errorToThrow = selectedTarget ?? error;
                        selectedTarget = undefined;
                        activity?.error(errorToThrow);
                        throw errorToThrow;
                    } finally {
                        activity?.stop();
                    }
                    if (targetIntegrityTraits & TargetIntegrityTraits.Revoked) {
                        // the target is a revoked proxy, in which case we revoke
                        // this proxy as well.
                        this.revoke();
                        return;
                    }
                }
                // A proxy can revoke itself when traps are triggered and break
                // the membrane, therefore we need protection.
                try {
                    copyForeignOwnPropertyDescriptorsAndPrototypeToShadowTarget(
                        foreignTargetPointer,
                        shadowTarget
                    );
                } catch {
                    const activity = instrumentation
                        ? instrumentation.startActivity('callableIsTargetRevoked')
                        : undefined;
                    let shouldRevoke;
                    try {
                        shouldRevoke = foreignCallableIsTargetRevoked(foreignTargetPointer);
                    } catch (error: any) {
                        const errorToThrow = selectedTarget ?? error;
                        selectedTarget = undefined;
                        activity?.error(errorToThrow);
                        throw errorToThrow;
                    } finally {
                        activity?.stop();
                    }
                    if (shouldRevoke) {
                        this.revoke();
                        return;
                    }
                }
                if (
                    this.foreignTargetTraits & TargetTraits.IsObject &&
                    !ReflectHas(shadowTarget, TO_STRING_TAG_SYMBOL)
                ) {
                    const activity = instrumentation
                        ? instrumentation.startActivity('callableGetToStringTagOfTarget')
                        : undefined;
                    let toStringTag;
                    try {
                        toStringTag = foreignCallableGetToStringTagOfTarget(foreignTargetPointer);
                    } catch (error: any) {
                        const errorToThrow = selectedTarget ?? error;
                        selectedTarget = undefined;
                        activity?.error(errorToThrow);
                        throw errorToThrow;
                    } finally {
                        activity?.stop();
                    }
                    // The default language toStringTag is "Object". If receive
                    // "Object" we return `undefined` to let the language resolve
                    // it naturally without projecting a value.
                    if (toStringTag !== 'Object') {
                        this.staticToStringTag = toStringTag;
                    }
                }
                // Preserve the semantics of the target.
                if (targetIntegrityTraits & TargetIntegrityTraits.IsFrozen) {
                    ObjectFreeze(shadowTarget);
                } else if (targetIntegrityTraits & TargetIntegrityTraits.IsSealed) {
                    ObjectSeal(shadowTarget);
                } else if (targetIntegrityTraits & TargetIntegrityTraits.IsNotExtensible) {
                    ReflectPreventExtensions(shadowTarget);
                } else if (LOCKER_UNMINIFIED_FLAG && LOCKER_DEBUG_MODE_FLAG !== false) {
                    try {
                        LOCKER_DEBUG_MODE_FLAG = foreignCallableDebugInfo(
                            'Mutations on the membrane of an object originating ' +
                                'outside of the sandbox will not be reflected on ' +
                                'the object itself:',
                            foreignTargetPointer
                        );
                        // eslint-disable-next-line no-empty
                    } catch {}
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
                const activity = instrumentation
                    ? instrumentation.startActivity('callableIsTargetLive')
                    : undefined;
                let shouldMakeProxyLive;
                try {
                    shouldMakeProxyLive = foreignCallableIsTargetLive(this.foreignTargetPointer);
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    activity?.error(errorToThrow);
                    throw errorToThrow;
                } finally {
                    activity?.stop();
                }
                if (shouldMakeProxyLive) {
                    this.makeProxyLive();
                } else {
                    this.makeProxyStatic(shadowTarget);
                }
            }

            // Logic implementation of all traps.

            // Default traps:

            // Pending traps are only needed if the membrane traps mutations to
            // avoid mutation operations on the other side of the membrane.
            private static defaultDefinePropertyTrap = trapMutations
                ? BoundaryProxyHandler.pendingDefinePropertyTrap
                : BoundaryProxyHandler.passthruDefinePropertyTrap;

            private static defaultDeletePropertyTrap = trapMutations
                ? BoundaryProxyHandler.pendingDeletePropertyTrap
                : BoundaryProxyHandler.passthruDeletePropertyTrap;

            private static defaultGetOwnPropertyDescriptorTrap =
                BoundaryProxyHandler.passthruGetOwnPropertyDescriptorTrap;

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

            // Hybrid traps:
            // (traps that operate on their shadowTarget, proxy, and foreignTargetPointer):

            private static hybridGetTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                key: string | symbol,
                receiver: any
            ): ReturnType<typeof Reflect.get> {
                const { foreignTargetPointer } = this;
                const safeDesc = lookupForeignDescriptor(foreignTargetPointer, shadowTarget, key);
                if (safeDesc) {
                    const { get: getter, value: localValue } = safeDesc;
                    if (getter) {
                        // Even though the getter function exists, we can't use
                        // `ReflectGet()` because there might be a distortion for
                        // that getter function, in which case we must resolve
                        // the local getter and call it instead.
                        return ReflectApply(getter, receiver, []);
                    }
                    return localValue;
                }
                if (
                    key === TO_STRING_TAG_SYMBOL &&
                    this.foreignTargetTraits & TargetTraits.IsObject
                ) {
                    const activity = instrumentation
                        ? instrumentation.startActivity('callableGetToStringTagOfTarget')
                        : undefined;
                    let toStringTag;
                    try {
                        toStringTag = foreignCallableGetToStringTagOfTarget(foreignTargetPointer);
                    } catch (error: any) {
                        const errorToThrow = selectedTarget ?? error;
                        selectedTarget = undefined;
                        activity?.error(errorToThrow);
                        throw errorToThrow;
                    } finally {
                        activity?.stop();
                    }
                    // The default language toStringTag is "Object". If receive
                    // "Object" we return `undefined` to let the language resolve
                    // it naturally without projecting a value.
                    if (toStringTag !== 'Object') {
                        return toStringTag;
                    }
                }
                return undefined;
            }

            private static hybridHasTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                key: string | symbol
            ): ReturnType<typeof Reflect.has> {
                const activity = instrumentation
                    ? instrumentation.startActivity(
                          'callableBatchGetPrototypeOfWhenHasNoOwnProperty'
                      )
                    : undefined;
                let trueOrProtoPointerOrNull;
                try {
                    trueOrProtoPointerOrNull =
                        foreignCallableBatchGetPrototypeOfWhenHasNoOwnProperty(
                            this.foreignTargetPointer,
                            key
                        );
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    activity?.error(errorToThrow);
                    throw errorToThrow;
                } finally {
                    activity?.stop();
                }
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

            // Passthru traps:

            private static passthruDefinePropertyTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                key: string | symbol,
                unsafePartialDesc: PropertyDescriptor
            ): ReturnType<typeof Reflect.defineProperty> {
                lastProxyTrapCalled = ProxyHandlerTraps.DefineProperty;
                const activity = instrumentation
                    ? instrumentation.startActivity('callableDefineProperty')
                    : undefined;
                const descMeta = getDescriptorMeta(unsafePartialDesc);
                const { foreignTargetPointer } = this;
                try {
                    return foreignCallableDefineProperty(
                        foreignTargetPointer,
                        key,
                        descMeta[0], // configurable
                        descMeta[1], // enumerable
                        descMeta[2], // writable
                        descMeta[3], // valuePointer
                        descMeta[4], // getPointer
                        descMeta[5], // setPointer
                        // foreignCallableNonConfigurableDescriptorCallback
                        (
                            configurable,
                            enumerable,
                            writable,
                            valuePointer,
                            getPointer,
                            setPointer
                        ) => {
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
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    activity?.error(errorToThrow);
                    throw errorToThrow;
                } finally {
                    activity?.stop();
                }
            }

            private static passthruDeletePropertyTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                key: string | symbol
            ): ReturnType<typeof Reflect.deleteProperty> {
                lastProxyTrapCalled = ProxyHandlerTraps.DeleteProperty;
                const activity = instrumentation
                    ? instrumentation.startActivity('callableDeleteProperty')
                    : undefined;
                try {
                    return foreignCallableDeleteProperty(this.foreignTargetPointer, key);
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    activity?.error(errorToThrow);
                    throw errorToThrow;
                } finally {
                    activity?.stop();
                }
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
                nearMembraneSymbolFlag &&= lastProxyTrapCalled === ProxyHandlerTraps.Has;
                lastProxyTrapCalled = ProxyHandlerTraps.Get;
                if (nearMembraneSymbolFlag) {
                    // Exit without performing a [[Get]] for near-membrane symbols
                    // because we know when the nearMembraneSymbolFlag is
                    // open that there is no shadowed symbol value.
                    if (key === LOCKER_NEAR_MEMBRANE_SYMBOL) {
                        return true;
                    }
                    if (key === LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL) {
                        return this.serializedValue;
                    }
                }
                const activity = instrumentation
                    ? instrumentation.startActivity('callableGet')
                    : undefined;
                const transferableReceiver = getTransferableValue(receiver);
                try {
                    const pointerOrPrimitive = foreignCallableGet(
                        this.foreignTargetPointer,
                        this.foreignTargetTraits,
                        key,
                        transferableReceiver
                    );
                    // Inline getLocalValue().
                    let result: any = pointerOrPrimitive;
                    if (typeof pointerOrPrimitive === 'function') {
                        pointerOrPrimitive();
                        result = selectedTarget;
                        selectedTarget = undefined;
                    }
                    return result;
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    activity?.error(errorToThrow);
                    throw errorToThrow;
                } finally {
                    activity?.stop();
                }
            }

            private static passthruGetPrototypeOfTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget
            ): ReturnType<typeof Reflect.getPrototypeOf> {
                lastProxyTrapCalled = ProxyHandlerTraps.GetPrototypeOf;
                const activity = instrumentation
                    ? instrumentation.startActivity('callableGetPrototypeOf')
                    : undefined;
                let protoPointerOrNull;
                try {
                    protoPointerOrNull = foreignCallableGetPrototypeOf(this.foreignTargetPointer);
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    activity?.error(errorToThrow);
                    throw errorToThrow;
                } finally {
                    activity?.stop();
                }
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
                const activity = instrumentation
                    ? instrumentation.startActivity('callableHas')
                    : undefined;
                let result;
                try {
                    result = foreignCallableHas(this.foreignTargetPointer, key);
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    activity?.error(errorToThrow);
                    throw errorToThrow;
                } finally {
                    activity?.stop();
                }
                // The near-membrane symbol flag is on if the symbol does not
                // exist on the object or its [[Prototype]].
                nearMembraneSymbolFlag =
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
                    const activity = instrumentation
                        ? instrumentation.startActivity('callableIsExtensible')
                        : undefined;
                    const { foreignTargetPointer } = this;
                    try {
                        if (foreignCallableIsExtensible(foreignTargetPointer)) {
                            return true;
                        }
                    } catch (error: any) {
                        const errorToThrow = selectedTarget ?? error;
                        selectedTarget = undefined;
                        activity?.error(errorToThrow);
                        throw errorToThrow;
                    } finally {
                        activity?.stop();
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
                const activity = instrumentation
                    ? instrumentation.startActivity('callableOwnKeys')
                    : undefined;
                let ownKeys: ReturnType<typeof Reflect.ownKeys>;
                try {
                    foreignCallableOwnKeys(this.foreignTargetPointer, (...args) => {
                        ownKeys = args;
                    });
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    activity?.error(errorToThrow);
                    throw errorToThrow;
                } finally {
                    activity?.stop();
                }
                // @ts-ignore: Prevent used before assignment error.
                return ownKeys || [];
            }

            private static passthruGetOwnPropertyDescriptorTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                key: string | symbol
            ): ReturnType<typeof Reflect.getOwnPropertyDescriptor> {
                lastProxyTrapCalled = ProxyHandlerTraps.GetOwnPropertyDescriptor;
                const activity = instrumentation
                    ? instrumentation.startActivity('callableGetOwnPropertyDescriptor')
                    : undefined;
                let safeDesc: PropertyDescriptor | undefined;
                try {
                    foreignCallableGetOwnPropertyDescriptor(
                        this.foreignTargetPointer,
                        key,
                        (
                            configurable,
                            enumerable,
                            writable,
                            valuePointer,
                            getPointer,
                            setPointer
                        ) => {
                            safeDesc = createDescriptorFromMeta(
                                configurable,
                                enumerable,
                                writable,
                                valuePointer,
                                getPointer,
                                setPointer
                            );
                            if (safeDesc.configurable === false) {
                                // Update the descriptor to non-configurable on
                                // the shadow target.
                                ReflectDefineProperty(shadowTarget, key, safeDesc);
                            }
                        }
                    );
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    activity?.error(errorToThrow);
                    throw errorToThrow;
                } finally {
                    activity?.stop();
                }
                return safeDesc;
            }

            private static passthruPreventExtensionsTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget
            ): ReturnType<typeof Reflect.preventExtensions> {
                lastProxyTrapCalled = ProxyHandlerTraps.PreventExtensions;
                if (ReflectIsExtensible(shadowTarget)) {
                    const activity = instrumentation
                        ? instrumentation.startActivity('callablePreventExtensions')
                        : undefined;
                    const { foreignTargetPointer } = this;
                    let result;
                    try {
                        result = foreignCallablePreventExtensions(foreignTargetPointer);
                    } catch (error: any) {
                        const errorToThrow = selectedTarget ?? error;
                        selectedTarget = undefined;
                        activity?.error(errorToThrow);
                        throw errorToThrow;
                    } finally {
                        activity?.stop();
                    }
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
                const activity = instrumentation
                    ? instrumentation.startActivity('callableSetPrototypeOf')
                    : undefined;
                const transferableProto = proto ? getTransferablePointer(proto) : proto;
                try {
                    return foreignCallableSetPrototypeOf(
                        this.foreignTargetPointer,
                        transferableProto
                    );
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    activity?.error(errorToThrow);
                    throw errorToThrow;
                } finally {
                    activity?.stop();
                }
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
                    const activity = instrumentation
                        ? instrumentation.startActivity('callableSet')
                        : undefined;
                    const transferableValue = getTransferableValue(value);
                    const transferableReceiver = getTransferablePointer(receiver);
                    try {
                        return foreignCallableSet(
                            foreignTargetPointer,
                            key,
                            transferableValue,
                            transferableReceiver
                        );
                    } catch (error: any) {
                        const errorToThrow = selectedTarget ?? error;
                        selectedTarget = undefined;
                        activity?.error(errorToThrow);
                        throw errorToThrow;
                    } finally {
                        activity?.stop();
                    }
                }
                const safeDesc = lookupForeignDescriptor(foreignTargetPointer, shadowTarget, key);
                // Following the specification steps for
                // OrdinarySetWithOwnDescriptor ( O, P, V, Receiver, ownDesc ).
                // https://tc39.es/ecma262/#sec-ordinarysetwithowndescriptor
                if (safeDesc) {
                    if ('get' in safeDesc || 'set' in safeDesc) {
                        const { set: setter } = safeDesc;
                        if (setter) {
                            // Even though the setter function exists, we can't
                            // use `ReflectSet()` because there might be a
                            // distortion for that setter function, in which
                            // case we must resolve the local setter and call
                            // it instead.
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
                // `ReflectDefineProperty()` and `ReflectSet()` both are expected
                // to return `false` when attempting to add a new property if the
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
                    return this.staticToStringTag;
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
            (): any => {
                const result = selectedTarget;
                selectedTarget = undefined;
                return result;
            },
            // getTransferableValue
            getTransferableValue,
            // callableGetPropertyValuePointer: this callable function allows
            // the foreign realm to access a linkable pointer for a property value.
            // In order to do that, the foreign side must provide a pointer and
            // a key access the value in order to produce a pointer
            (targetPointer: Pointer, key: string | symbol) => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                const value: ProxyTarget = target[key];
                return createPointer(value);
            },
            // callableEvaluate
            (sourceText: string): PointerOrPrimitive => {
                try {
                    const result = localEval(sourceText);
                    // Inline getTransferableValue().
                    if (typeof result === 'undefined') {
                        return undefined;
                    }
                    if (
                        result === null ||
                        (typeof result !== 'function' && typeof result !== 'object')
                    ) {
                        return result;
                    }
                    return getTransferablePointer(result);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
            },
            // callableLinkPointers: this callable function allows the foreign
            // realm to define a linkage between two values across the membrane.
            (targetPointer: Pointer, newPointer: Pointer) => {
                targetPointer();
                const target = selectedTarget;
                selectedTarget = undefined;
                if (
                    (typeof target === 'object' && target !== null) ||
                    typeof target === 'function'
                ) {
                    ReflectApply(WeakMapProtoSet, proxyTargetToPointerMap, [target, newPointer]);
                }
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
                ReflectApply(WeakMapProtoSet, proxyTargetToPointerMap, [
                    proxy,
                    foreignTargetPointer,
                ]);
                return createPointer(proxy);
            },
            // callableApply
            (
                targetPointer: Pointer,
                thisArgPointerOrPrimitive: PointerOrPrimitive,
                ...listOfPointersOrPrimitives: PointerOrPrimitive[]
            ): PointerOrPrimitive => {
                targetPointer();
                const func = selectedTarget as Function;
                selectedTarget = undefined;
                // Inline getLocalValue().
                let thisArg = thisArgPointerOrPrimitive as ProxyTarget | undefined;
                if (typeof thisArgPointerOrPrimitive === 'function') {
                    thisArgPointerOrPrimitive();
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
                        localValue = selectedTarget;
                        selectedTarget = undefined;
                    }
                    args[i] = localValue;
                }
                let value;
                try {
                    value = ReflectApply(func, thisArg, args);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
                // Inline getTransferableValue().
                if (typeof value === 'undefined') {
                    return undefined;
                }
                if (value === null || (typeof value !== 'function' && typeof value !== 'object')) {
                    return value;
                }
                return getTransferablePointer(value);
            },
            // callableConstruct
            (
                targetPointer: Pointer,
                newTargetPointerOrValue: PointerOrPrimitive,
                ...listOfPointersOrPrimitives: PointerOrPrimitive[]
            ): PointerOrPrimitive => {
                targetPointer();
                const constructor = selectedTarget as Function;
                selectedTarget = undefined;
                // Inline getLocalValue().
                let newTarget = newTargetPointerOrValue as Function | undefined;
                if (typeof newTargetPointerOrValue === 'function') {
                    newTargetPointerOrValue();
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
                        localValue = selectedTarget;
                        selectedTarget = undefined;
                    }
                    args[i] = localValue;
                }
                let value;
                try {
                    value = ReflectConstruct(constructor, args, newTarget);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
                // Inline getTransferableValue().
                if (typeof value === 'undefined') {
                    return undefined;
                }
                if (value === null || (typeof value !== 'function' && typeof value !== 'object')) {
                    return value;
                }
                return getTransferablePointer(value);
            },
            // callableDefineProperty
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
                const target = selectedTarget!;
                selectedTarget = undefined;
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
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
                if (
                    result &&
                    configurable === false &&
                    typeof foreignCallableNonConfigurableDescriptorCallback === 'function'
                ) {
                    let unsafeDesc;
                    try {
                        unsafeDesc = ReflectGetOwnPropertyDescriptor(target, key);
                    } catch (error: any) {
                        throw pushErrorAcrossBoundary(error);
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
            // callableDeleteProperty
            (targetPointer: Pointer, key: string | symbol): boolean => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                try {
                    return ReflectDeleteProperty(target, key);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
            },
            // callableGet
            (
                targetPointer: Pointer,
                targetTraits: TargetTraits,
                key: string | symbol,
                receiverPointerOrPrimitive: PointerOrPrimitive
            ): PointerOrPrimitive => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                const receiver = getLocalValue(receiverPointerOrPrimitive);
                let result;
                try {
                    result = getTransferableValue(ReflectGet(target, key, receiver));
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
                if (
                    result === undefined &&
                    key === TO_STRING_TAG_SYMBOL &&
                    (targetTraits === TargetTraits.None || targetTraits & TargetTraits.IsObject)
                ) {
                    try {
                        if (!ReflectHas(target, key)) {
                            const toStringTag = getToStringTagOfTarget(target);
                            // The default language toStringTag is "Object".
                            // If receive "Object" we return `undefined` to
                            // let the language resolve it naturally without
                            // projecting a value.
                            if (toStringTag !== 'Object') {
                                result = toStringTag;
                            }
                        }
                    } catch (error: any) {
                        throw pushErrorAcrossBoundary(error);
                    }
                }
                return result;
            },
            // callableGetOwnPropertyDescriptor
            (
                targetPointer: Pointer,
                key: string | symbol,
                foreignCallableDescriptorCallback: CallableDescriptorCallback
            ): void => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                let unsafeDesc;
                try {
                    unsafeDesc = ReflectGetOwnPropertyDescriptor(target, key);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
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
            // callableGetPrototypeOf
            (targetPointer: Pointer): PointerOrPrimitive => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                let proto;
                try {
                    proto = ReflectGetPrototypeOf(target);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
                return proto ? getTransferablePointer(proto) : proto;
            },
            // callableHas
            (targetPointer: Pointer, key: string | symbol): boolean => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                try {
                    return ReflectHas(target, key);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
            },
            // callableIsExtensible
            (targetPointer: Pointer): boolean => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                try {
                    return ReflectIsExtensible(target);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
            },
            // callableOwnKeys
            (
                targetPointer: Pointer,
                foreignCallableKeysCallback: (...args: ReturnType<typeof Reflect.ownKeys>) => void
            ): void => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                let ownKeys;
                try {
                    ownKeys = ReflectOwnKeys(target) as (string | symbol)[];
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
                ReflectApply(foreignCallableKeysCallback, undefined, ownKeys);
            },
            // callablePreventExtensions
            (targetPointer: Pointer): PreventExtensionsResult => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                let result = PreventExtensionsResult.False;
                try {
                    if (ReflectPreventExtensions(target)) {
                        result = PreventExtensionsResult.True;
                    }
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
                if (result & PreventExtensionsResult.False && ReflectIsExtensible(target)) {
                    result |= PreventExtensionsResult.Extensible;
                }
                return result;
            },
            // callableSet
            (
                targetPointer: Pointer,
                key: string | symbol,
                valuePointer: Pointer,
                receiverPointerOrPrimitive: PointerOrPrimitive
            ): boolean => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                try {
                    return ReflectSet(
                        target,
                        key,
                        getLocalValue(valuePointer),
                        getLocalValue(receiverPointerOrPrimitive)
                    );
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
            },
            // callableSetPrototypeOf
            (targetPointer: Pointer, protoPointerOrNull: Pointer | null): boolean => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                const proto = protoPointerOrNull
                    ? (getLocalValue(protoPointerOrNull) as object)
                    : (protoPointerOrNull as null);
                try {
                    return ReflectSetPrototypeOf(target, proto);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
            },
            // callableDebugInfo
            (...args: Parameters<typeof console.info>): boolean => {
                if (
                    !isInShadowRealm &&
                    LOCKER_UNMINIFIED_FLAG &&
                    LOCKER_DEBUG_MODE_FLAG === undefined
                ) {
                    LOCKER_DEBUG_MODE_FLAG = ReflectApply(
                        ObjectProtoHasOwnProperty,
                        globalThisRef,
                        [LOCKER_DEBUG_MODE_SYMBOL]
                    );
                    if (LOCKER_DEBUG_MODE_FLAG) {
                        installErrorPrepareStackTrace();
                        try {
                            foreignCallableInstallErrorPrepareStackTrace();
                            // eslint-disable-next-line no-empty
                        } catch {}
                    }
                }
                if (LOCKER_DEBUG_MODE_FLAG) {
                    for (let i = 0, { length } = args; i < length; i += 1) {
                        args[i] = getLocalValue(args[i]);
                    }
                    try {
                        ReflectApply(consoleInfoRef, consoleRef, args);
                    } catch (error: any) {
                        throw pushErrorAcrossBoundary(error);
                    }
                    return true;
                }
                return false;
            },
            // callableGetTargetIntegrityTraits
            (targetPointer: Pointer): TargetIntegrityTraits => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                // No need to wrap in a try-catch as `getTargetIntegrityTraits()`
                // cannot throw.
                return getTargetIntegrityTraits(target);
            },
            // callableGetToStringTagOfTarget
            (targetPointer: Pointer): string => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                try {
                    return getToStringTagOfTarget(target);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
            },
            // callableInstallErrorPrepareStackTrace
            installErrorPrepareStackTrace,
            // callableInstallLazyDescriptors
            (
                targetPointer: Pointer,
                ...ownKeysAndUnforgeableGlobalThisKeys: (string | symbol)[]
            ) => {
                const sliceIndex = ReflectApply(
                    ArrayProtoIndexOf,
                    ownKeysAndUnforgeableGlobalThisKeys,
                    [LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL]
                );
                let ownKeys;
                let unforgeableGlobalThisKeys;
                if (sliceIndex === -1) {
                    ownKeys = ownKeysAndUnforgeableGlobalThisKeys;
                } else {
                    ownKeys = ReflectApply(ArrayProtoSlice, ownKeysAndUnforgeableGlobalThisKeys, [
                        0,
                        sliceIndex,
                    ]);
                    unforgeableGlobalThisKeys = ReflectApply(
                        ArrayProtoSlice,
                        ownKeysAndUnforgeableGlobalThisKeys,
                        [sliceIndex + 1]
                    );
                }
                if (!isInShadowRealm) {
                    return;
                }
                installPropertyDescriptorMethodWrappers(unforgeableGlobalThisKeys);
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                let lazyState = ReflectApply(WeakMapProtoGet, proxyTargetToLazyPropertyStateMap, [
                    target,
                ]);
                if (lazyState === undefined) {
                    lazyState = { __proto__: null };
                    ReflectApply(WeakMapProtoSet, proxyTargetToLazyPropertyStateMap, [
                        target,
                        lazyState,
                    ]);
                }
                for (let i = 0, { length } = ownKeys; i < length; i += 1) {
                    const ownKey = ownKeys[i];
                    lazyState[ownKey] = true;
                    ReflectDefineProperty(
                        target,
                        ownKey,
                        createLazyDescriptor(target, ownKey, lazyState)
                    );
                }
            },
            // callableIsTargetLive
            (targetPointer: Pointer): boolean => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                try {
                    return isTargetLive(target);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
            },
            // callableIsTargetRevoked
            (targetPointer: Pointer): boolean => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                try {
                    return isTargetRevoked(target);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
            },
            // callableSerializeTarget
            (targetPointer: Pointer): SerializedValue | undefined => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                try {
                    return serializeTarget(target);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
            },
            // callableBatchGetPrototypeOfAndOwnPropertyDescriptors
            (
                targetPointer: Pointer,
                foreignCallableDescriptorsCallback: CallableDescriptorsCallback
            ): PointerOrPrimitive => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                let unsafeDescMap;
                try {
                    unsafeDescMap = ObjectGetOwnPropertyDescriptors(target);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
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
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
                return proto ? getTransferablePointer(proto) : proto;
            },
            // callableBatchGetPrototypeOfWhenHasNoOwnProperty
            (targetPointer: Pointer, key: string | symbol): PointerOrPrimitive => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                let result;
                try {
                    result = ReflectApply(ObjectProtoHasOwnProperty, target, [key]);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
                if (result) {
                    return result;
                }
                let proto;
                try {
                    proto = ReflectGetPrototypeOf(target);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
                return proto ? getTransferablePointer(proto) : proto;
            },
            // callableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor
            (
                targetPointer: Pointer,
                key: string | symbol,
                foreignCallableDescriptorCallback: CallableDescriptorCallback
            ): PointerOrPrimitive => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                let unsafeDesc;
                try {
                    unsafeDesc = ReflectGetOwnPropertyDescriptor(target, key);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
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
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
                return proto ? getTransferablePointer(proto) : proto;
            }
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
                11: callableGet,
                12: callableGetOwnPropertyDescriptor,
                13: callableGetPrototypeOf,
                14: callableHas,
                15: callableIsExtensible,
                16: callableOwnKeys,
                17: callablePreventExtensions,
                18: callableSet,
                19: callableSetPrototypeOf,
                20: callableDebugInfo,
                21: callableGetTargetIntegrityTraits,
                22: callableGetToStringTagOfTarget,
                23: callableInstallErrorPrepareStackTrace,
                // 24: callableInstallLazyDescriptors,
                25: callableIsTargetLive,
                26: callableIsTargetRevoked,
                27: callableSerializeTarget,
                28: callableBatchGetPrototypeOfAndOwnPropertyDescriptors,
                29: callableBatchGetPrototypeOfWhenHasNoOwnProperty,
                30: callableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor,
            } = hooks;
            foreignCallablePushTarget = callablePushTarget;
            // traps utilities
            foreignCallableApply = callableApply;
            foreignCallableConstruct = callableConstruct;
            foreignCallableDefineProperty = callableDefineProperty;
            foreignCallableDeleteProperty = callableDeleteProperty;
            foreignCallableGet = callableGet;
            foreignCallableGetOwnPropertyDescriptor = callableGetOwnPropertyDescriptor;
            foreignCallableGetPrototypeOf = callableGetPrototypeOf;
            foreignCallableHas = callableHas;
            foreignCallableIsExtensible = callableIsExtensible;
            foreignCallableOwnKeys = callableOwnKeys;
            foreignCallablePreventExtensions = callablePreventExtensions;
            foreignCallableSet = callableSet;
            foreignCallableSetPrototypeOf = callableSetPrototypeOf;
            foreignCallableDebugInfo = callableDebugInfo;
            foreignCallableGetTargetIntegrityTraits = callableGetTargetIntegrityTraits;
            foreignCallableGetToStringTagOfTarget = callableGetToStringTagOfTarget;
            foreignCallableInstallErrorPrepareStackTrace = callableInstallErrorPrepareStackTrace;
            foreignCallableIsTargetLive = callableIsTargetLive;
            foreignCallableIsTargetRevoked = callableIsTargetRevoked;
            foreignCallableSerializeTarget = callableSerializeTarget;
            foreignCallableBatchGetPrototypeOfAndOwnPropertyDescriptors =
                callableBatchGetPrototypeOfAndOwnPropertyDescriptors;
            foreignCallableBatchGetPrototypeOfWhenHasNoOwnProperty =
                callableBatchGetPrototypeOfWhenHasNoOwnProperty;
            foreignCallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor =
                callableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor;
        };
    };
    /* eslint-enable prefer-object-spread */
}
