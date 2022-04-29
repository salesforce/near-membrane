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

import { Instrumentation } from './instrumentation';
import { PropertyKey, PropertyKeys } from './types';

type CallablePushTarget = (
    foreignTargetPointer: () => void,
    foreignTargetTraits: number,
    foreignTargetFunctionArity: number | undefined,
    foreignTargetFunctionName: string | undefined
) => Pointer;
type CallablePushErrorTarget = CallablePushTarget;
type CallableApply = (
    targetPointer: Pointer,
    thisArgPointerOrUndefined: PointerOrPrimitive,
    ...args: PointerOrPrimitive[]
) => PointerOrPrimitive;
type CallableConstruct = (
    targetPointer: Pointer,
    newTargetPointer: PointerOrPrimitive,
    ...args: PointerOrPrimitive[]
) => PointerOrPrimitive;
type CallableDefineProperty = (
    targetPointer: Pointer,
    key: PropertyKey,
    configurable: boolean | symbol,
    enumerable: boolean | symbol,
    writable: boolean | symbol,
    valuePointer: PointerOrPrimitive,
    getPointer: PointerOrPrimitive,
    setPointer: PointerOrPrimitive,
    foreignCallableNonConfigurableDescriptorCallback: CallableNonConfigurableDescriptorCallback
) => boolean;
type CallableDeleteProperty = (targetPointer: Pointer, key: PropertyKey) => boolean;
type CallableGet = (
    targetPointer: Pointer,
    targetTraits: number,
    key: PropertyKey,
    receiverPointerOrPrimitive: PointerOrPrimitive
) => PointerOrPrimitive;
type CallableGetOwnPropertyDescriptor = (
    targetPointer: Pointer,
    key: PropertyKey,
    foreignCallableDescriptorCallback: CallableDescriptorCallback
) => void;
type CallableGetPrototypeOf = (targetPointer: Pointer) => PointerOrPrimitive;
type CallableHas = (targetPointer: Pointer, key: PropertyKey) => boolean;
type CallableIsExtensible = (targetPointer: Pointer) => boolean;
type CallableOwnKeys = (
    targetPointer: Pointer,
    foreignCallableKeysCallback: (...args: ReturnType<typeof Reflect.ownKeys>) => void
) => void;
type CallablePreventExtensions = (targetPointer: Pointer) => number;
type CallableSet = (
    targetPointer: Pointer,
    key: PropertyKey,
    valuePointerOrPrimitive: PointerOrPrimitive,
    receiverPointerOrPrimitive: PointerOrPrimitive
) => boolean;
type CallableDebugInfo = (...args: Parameters<typeof console.info>) => void;
type CallableGetLazyPropertyDescriptorStateByTarget = (
    targetPointer: Pointer
) => PointerOrPrimitive;
type CallableGetTargetIntegrityTraits = (targetPointer: Pointer) => number;
type CallableGetToStringTagOfTarget = (targetPointer: Pointer) => string;
type CallableInstallErrorPrepareStackTrace = () => void;
type CallableIsTargetLive = (targetPointer: Pointer) => boolean;
type CallableIsTargetRevoked = (targetPointer: Pointer) => boolean;
type CallableSerializeTarget = (targetPointer: Pointer) => SerializedValue | undefined;
type CallableSetLazyPropertyDescriptorStateByTarget = (
    targetPointer: Pointer,
    statePointer: Pointer
) => void;
type CallableBatchGetPrototypeOfAndGetOwnPropertyDescriptors = (
    targetPointer: Pointer,
    foreignCallableDescriptorsCallback: CallableDescriptorsCallback
) => PointerOrPrimitive;
type CallableBatchGetPrototypeOfWhenHasNoOwnProperty = (
    targetPointer: Pointer,
    key: PropertyKey
) => PointerOrPrimitive;
type CallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor = (
    targetPointer: Pointer,
    key: PropertyKey,
    foreignCallableDescriptorCallback: CallableDescriptorCallback
) => PointerOrPrimitive;
type CallableDescriptorCallback = (
    key: PropertyKey,
    configurable: boolean | symbol,
    enumerable: boolean | symbol,
    writable: boolean | symbol,
    valuePointer: PointerOrPrimitive,
    getPointer: PointerOrPrimitive,
    setPointer: PointerOrPrimitive
) => void;
type CallableDescriptorsCallback = (
    ...descriptorTuples: [...Parameters<CallableDescriptorCallback>]
) => void;
type CallableNonConfigurableDescriptorCallback = CallableDescriptorCallback;
interface HooksOptions {
    distortionCallback?: DistortionCallback;
    instrumentation?: Instrumentation;
}
type PointerOrPrimitive = Pointer | Primitive;
type Primitive = bigint | boolean | null | number | string | symbol | undefined;
type SerializedValue = bigint | boolean | number | string | symbol;
type ShadowTarget = ProxyTarget;
export type CallableDefineProperties = (
    targetPointer: Pointer,
    ...descriptorTuples: [...Parameters<CallableDescriptorCallback>]
) => void;
export type CallableEvaluate = (sourceText: string) => PointerOrPrimitive;
export type CallableGetPropertyValuePointer = (targetPointer: Pointer, key: PropertyKey) => Pointer;
export type CallableInstallLazyPropertyDescriptors = (
    targetPointer: Pointer,
    ...ownKeysAndUnforgeableGlobalThisKeys: PropertyKeys
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
    globalThisPointer: Pointer | undefined,
    getSelectedTarget: GetSelectedTarget | undefined,
    getTransferableValue: GetTransferableValue | undefined,
    callableGetPropertyValuePointer: CallableGetPropertyValuePointer | undefined,
    callableEvaluate: CallableEvaluate | undefined,
    callableLinkPointers: CallableLinkPointers | undefined,
    callablePushErrorTarget: CallablePushErrorTarget,
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
    callableDefineProperties: CallableDefineProperties | undefined,
    callableGetLazyPropertyDescriptorStateByTarget: CallableGetLazyPropertyDescriptorStateByTarget,
    callableGetTargetIntegrityTraits: CallableGetTargetIntegrityTraits,
    callableGetToStringTagOfTarget: CallableGetToStringTagOfTarget,
    callableInstallErrorPrepareStackTrace: CallableInstallErrorPrepareStackTrace,
    callableInstallLazyPropertyDescriptors: CallableInstallLazyPropertyDescriptors | undefined,
    callableIsTargetLive: CallableIsTargetLive,
    callableIsTargetRevoked: CallableIsTargetRevoked,
    callableSerializeTarget: CallableSerializeTarget,
    callableSetLazyPropertyDescriptorStateByTarget: CallableSetLazyPropertyDescriptorStateByTarget,
    callableBatchGetPrototypeOfAndGetOwnPropertyDescriptors: CallableBatchGetPrototypeOfAndGetOwnPropertyDescriptors,
    callableBatchGetPrototypeOfWhenHasNoOwnProperty: CallableBatchGetPrototypeOfWhenHasNoOwnProperty,
    callableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor: CallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor
) => void;
export type Pointer = CallableFunction;
export type ProxyTarget = CallableFunction | any[] | object;

const proxyTargetToLazyPropertyDescriptorStateByTargetMap = new WeakMap();

// istanbul ignore next
export function createMembraneMarshall(
    globalObjectVirtualizationTarget?: WindowProxy & typeof globalThis
) {
    /* eslint-disable prefer-object-spread */
    const ArrayCtor = Array;
    const ArrayBufferCtor = ArrayBuffer;
    const ErrorCtor = Error;
    const ObjectCtor = Object;
    const ProxyCtor = Proxy;
    const ReflectRef = Reflect;
    const RegExpCtor = RegExp;
    const SymbolCtor = Symbol;
    const TypeErrorCtor = TypeError;
    const WeakMapCtor = WeakMap;
    const { for: SymbolFor, toStringTag: TO_STRING_TAG_SYMBOL } = SymbolCtor;
    // @rollup/plugin-replace replaces `DEV_MODE` references.
    const DEV_MODE = true;
    const IS_IN_SHADOW_REALM =
        typeof globalObjectVirtualizationTarget !== 'object' ||
        globalObjectVirtualizationTarget === null;
    const FLAGS_REG_EXP = IS_IN_SHADOW_REALM ? /\w*$/ : undefined;
    const LOCKER_DEBUG_MODE_SYMBOL = !IS_IN_SHADOW_REALM
        ? SymbolFor('@@lockerDebugMode')
        : undefined;
    const LOCKER_IDENTIFIER_MARKER = '$LWS';
    const LOCKER_LIVE_VALUE_MARKER_SYMBOL = !IS_IN_SHADOW_REALM
        ? SymbolFor('@@lockerLiveValue')
        : undefined;
    const LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL = !IS_IN_SHADOW_REALM
        ? SymbolFor('@@lockerNearMembraneSerializedValue')
        : undefined;
    const LOCKER_NEAR_MEMBRANE_SYMBOL = !IS_IN_SHADOW_REALM
        ? SymbolFor('@@lockerNearMembrane')
        : undefined;
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
    // Indicate whether debug support is available.
    const LOCKER_DEBUGGABLE_FLAG = LOCKER_UNMINIFIED_FLAG && !IS_IN_SHADOW_REALM;
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
        keys: ObjectKeys,
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
        // eslint-disable-next-line @typescript-eslint/no-shadow, no-shadow
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
    const ArrayBufferProtoByteLengthGetter = !IS_IN_SHADOW_REALM
        ? ReflectApply(ObjectProto__lookupGetter__, ArrayBufferCtor.prototype, ['byteLength'])!
        : undefined;
    const BigIntProtoValueOf = SUPPORTS_BIG_INT ? BigInt.prototype.valueOf : undefined;
    const { valueOf: BooleanProtoValueOf } = Boolean.prototype;
    const { toString: ErrorProtoToString } = ErrorCtor.prototype;
    const { bind: FunctionProtoBind } = Function.prototype;
    const { stringify: JSONStringify } = JSON;
    const { valueOf: NumberProtoValueOf } = Number.prototype;
    const { revocable: ProxyRevocable } = ProxyCtor;
    const { prototype: RegExpProto } = RegExpCtor;
    const {
        exec: RegExpProtoExec,
        test: RegExpProtoTest,
        toString: RegExProtoToString,
    } = RegExpProto;
    // Edge 15 does not support RegExp.prototype.flags.
    // https://caniuse.com/mdn-javascript_builtins_regexp_flags
    const RegExpProtoFlagsGetter: (() => string) | undefined = IS_IN_SHADOW_REALM
        ? ReflectApply(ObjectProto__lookupGetter__, RegExpProto, ['flags']) ??
          function flags(this: RegExp) {
              const string = ReflectApply(RegExProtoToString, this, []);
              return ReflectApply(RegExpProtoExec, FLAGS_REG_EXP!, [string])[0] as string;
          }
        : undefined;
    const RegExpProtoSourceGetter = ReflectApply(ObjectProto__lookupGetter__, RegExpProto, [
        'source',
    ])!;
    const {
        replace: StringProtoReplace,
        slice: StringProtoSlice,
        valueOf: StringProtoValueOf,
    } = String.prototype;
    const { valueOf: SymbolProtoValueOf } = SymbolCtor.prototype;
    // eslint-disable-next-line @typescript-eslint/no-shadow, no-shadow
    const { get: WeakMapProtoGet, set: WeakMapProtoSet } = WeakMapCtor.prototype;
    const consoleObject =
        !IS_IN_SHADOW_REALM && typeof console === 'object' && console !== null
            ? console
            : undefined;
    const consoleInfo = consoleObject?.info;
    const localEval = IS_IN_SHADOW_REALM ? eval : undefined;

    const globalThisRef =
        globalObjectVirtualizationTarget ??
        // Support for globalThis was added in Chrome 71.
        (typeof globalThis !== 'undefined' ? globalThis : undefined) ??
        // However, environments like Android emulators are running Chrome 69.
        // eslint-disable-next-line no-restricted-globals
        (typeof self !== 'undefined' ? self : undefined) ??
        // See https://mathiasbynens.be/notes/globalthis for more details.
        (ReflectDefineProperty(ObjectProto, 'globalThis', {
            __proto__: null,
            configurable: true,
            get() {
                ReflectDeleteProperty(ObjectProto, 'globalThis');
                // Safari 12 on iOS 12.1 has a `this` of `undefined` so we
                // fallback to `self`.
                // eslint-disable-next-line no-restricted-globals
                return this ?? self;
            },
        } as PropertyDescriptor),
        globalThis);
    // Install flags to ensure things are installed once per realm.
    let installedErrorPrepareStackTraceFlag = false;
    let installedPropertyDescriptorMethodWrappersFlag = false;
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

    function alwaysFalse() {
        return false;
    }

    function identity<T>(value: T): T {
        return value;
    }

    const installErrorPrepareStackTrace = LOCKER_UNMINIFIED_FLAG
        ? () => {
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
              // A regexp to detect call sites containing LOCKER_IDENTIFIER_MARKER.
              const lockerFunctionNameMarkerRegExp = new RegExpCtor(
                  `${
                      // Escape regexp special characters in LOCKER_IDENTIFIER_MARKER.
                      ReflectApply(StringProtoReplace, LOCKER_IDENTIFIER_MARKER, [
                          /[\\^$.*+?()[\]{}|]/g,
                          '\\$&',
                      ])
                      // Function name references in call sites also contain
                      // the name of the class they belong to,
                      // e.g. myClassName.myFunctionName.
                  }(?=\\.|$)`
              );
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
                          ReflectApply(RegExpProtoTest, lockerFunctionNameMarkerRegExp, [funcName])
                      ) {
                          isMarked = true;
                      }
                      if (!isMarked) {
                          const evalOrigin = ReflectApply(CallSiteProtoGetEvalOrigin, callSite, []);
                          if (
                              typeof evalOrigin === 'string' &&
                              ReflectApply(RegExpProtoTest, lockerFunctionNameMarkerRegExp, [
                                  evalOrigin,
                              ])
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
                          stackTrace += `\n    at ${ReflectApply(
                              CallSiteProtoToString,
                              callSite,
                              []
                          )}`;
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
              if (
                  typeof stackTraceLimit !== 'number' ||
                  stackTraceLimit < LOCKER_STACK_TRACE_LIMIT
              ) {
                  ErrorCtor.stackTraceLimit = LOCKER_STACK_TRACE_LIMIT;
              }
          }
        : (noop as CallableInstallErrorPrepareStackTrace);

    function noop() {
        // No-operation.
    }

    const serializeBigIntObject = IS_IN_SHADOW_REALM
        ? (bigIntObject: BigInt): bigint =>
              // Section 21.2.3 Properties of the BigInt Prototype Object
              // https://tc39.es/ecma262/#thisbigintvalue
              // Step 2: If Type(value) is Object and value has a [[BigIntData]] internal slot, then
              //     a. Assert: Type(value.[[BigIntData]]) is BigInt.
              ReflectApply(BigIntProtoValueOf!, bigIntObject, [])
        : (noop as () => undefined);

    const serializeBooleanObject = IS_IN_SHADOW_REALM
        ? (booleanObject: Boolean): boolean =>
              // Section 20.3.3 Properties of the Boolean Prototype Object
              // https://tc39.es/ecma262/#thisbooleanvalue
              // Step 2: If Type(value) is Object and value has a [[BooleanData]] internal slot, then
              //     a. Let b be value.[[BooleanData]].
              //     b. Assert: Type(b) is Boolean.
              ReflectApply(BooleanProtoValueOf, booleanObject, [])
        : (noop as () => undefined);

    const serializeNumberObject = IS_IN_SHADOW_REALM
        ? (numberObject: Number): number =>
              // 21.1.3 Properties of the Number Prototype Object
              // https://tc39.es/ecma262/#thisnumbervalue
              // Step 2: If Type(value) is Object and value has a [[NumberData]] internal slot, then
              //     a. Let n be value.[[NumberData]].
              //     b. Assert: Type(n) is Number.
              ReflectApply(NumberProtoValueOf, numberObject, [])
        : (noop as () => undefined);

    const serializeRegExp = IS_IN_SHADOW_REALM
        ? (value: any): string | undefined => {
              // 22.2.5.12 get RegExp.prototype.source
              // https://tc39.es/ecma262/#sec-get-regexp.prototype.source
              // Step 3: If R does not have an [[OriginalSource]] internal slot, then
              //     a. If SameValue(R, %RegExp.prototype%) is true, return "(?:)".
              //     b. Otherwise, throw a TypeError exception.
              if (value !== RegExpProto) {
                  const source = ReflectApply(RegExpProtoSourceGetter, value, []);
                  return JSONStringify({
                      __proto__: null,
                      flags: ReflectApply(RegExpProtoFlagsGetter!, value, []),
                      source,
                  });
              }
              return undefined;
          }
        : (noop as () => undefined);

    const serializeStringObject = IS_IN_SHADOW_REALM
        ? (stringObject: String): string =>
              // 22.1.3 Properties of the String Prototype Object
              // https://tc39.es/ecma262/#thisstringvalue
              // Step 2: If Type(value) is Object and value has a [[StringData]] internal slot, then
              //     a. Let s be value.[[StringData]].
              //     b. Assert: Type(s) is String.
              ReflectApply(StringProtoValueOf, stringObject, [])
        : (noop as () => undefined);

    const serializeSymbolObject = IS_IN_SHADOW_REALM
        ? (symbolObject: Symbol): symbol =>
              // 20.4.3 Properties of the Symbol Prototype Object
              // https://tc39.es/ecma262/#thissymbolvalue
              // Step 2: If Type(value) is Object and value has a [[SymbolData]] internal slot, then
              //     a. Let s be value.[[SymbolData]].
              //     b. Assert: Type(s) is Symbol.
              ReflectApply(SymbolProtoValueOf, symbolObject, [])
        : (noop as () => undefined);

    const serializeTargetByBrand = IS_IN_SHADOW_REALM
        ? (target: ProxyTarget): SerializedValue | undefined => {
              const brand = ReflectApply(ObjectProtoToString, target, []);
              switch (brand) {
                  // The brand checks below represent boxed primitives of
                  // `ESGlobalKeys` in packages/near-membrane-base/src/intrinsics.ts
                  // which are not remapped or reflective.
                  case '[object Boolean]':
                      return serializeBooleanObject(target as any);
                  case '[object Number]':
                      return serializeNumberObject(target as any);
                  case '[object RegExp]':
                      return serializeRegExp(target as any);
                  case '[object String]':
                      return serializeStringObject(target as any);
                  case '[object Object]':
                      try {
                          // Symbol.prototype[@@toStringTag] is defined by default so
                          // must have been removed.
                          // https://tc39.es/ecma262/#sec-symbol.prototype-@@tostringtag
                          return serializeSymbolObject(target as any);
                          // eslint-disable-next-line no-empty
                      } catch {}
                      if (SUPPORTS_BIG_INT) {
                          // BigInt.prototype[@@toStringTag] is defined by default so
                          // must have been removed.
                          // https://tc39.es/ecma262/#sec-bigint.prototype-@@tostringtag
                          try {
                              return serializeBigIntObject(target as any);
                              // eslint-disable-next-line no-empty
                          } catch {}
                      }
                  // eslint-disable-next-line no-fallthrough
                  default:
                      return undefined;
              }
          }
        : (noop as () => undefined);

    const serializeTargetByTrialAndError = IS_IN_SHADOW_REALM
        ? (target: ProxyTarget): SerializedValue | undefined => {
              // The serialization attempts below represent boxed primitives of
              // `ESGlobalKeys` in packages/near-membrane-base/src/intrinsics.ts
              // which are not remapped or reflective.
              try {
                  // Symbol.prototype[@@toStringTag] is defined by default so
                  // attempted before others.
                  // https://tc39.es/ecma262/#sec-symbol.prototype-@@tostringtag
                  return serializeSymbolObject(target as any);
                  // eslint-disable-next-line no-empty
              } catch {}
              if (SUPPORTS_BIG_INT) {
                  // BigInt.prototype[@@toStringTag] is defined by default so
                  // attempted before others.
                  // https://tc39.es/ecma262/#sec-bigint.prototype-@@tostringtag
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
        : (noop as () => undefined);

    return function createHooksCallback(
        color: string,
        foreignCallableHooksCallback: HooksCallback,
        options?: HooksOptions
    ): HooksCallback {
        const {
            distortionCallback = identity,
            instrumentation,
            // eslint-disable-next-line prefer-object-spread
        } = ObjectAssign({ __proto__: null }, options);

        const LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG: boolean =
            // In the future we can preface the LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG
            // definition with a LOCKER_UNMINIFIED_FLAG check to have instrumentation
            // removed in minified production builds.
            !IS_IN_SHADOW_REALM && typeof instrumentation === 'object' && instrumentation !== null;

        const arityToApplyTrapNameRegistry: any = {
            // Populated in the returned connector function below.
            __proto__: null,
            0: undefined,
            1: undefined,
            2: undefined,
            3: undefined,
            4: undefined,
            n: undefined,
        };

        const arityToConstructTrapNameRegistry: any = {
            // Populated in the returned connector function below.
            __proto__: null,
            0: undefined,
            1: undefined,
            2: undefined,
            3: undefined,
            4: undefined,
            n: undefined,
        };

        const localProxyTargetToLazyPropertyDescriptorStateByTargetMap = new WeakMapCtor();
        const proxyTargetToPointerMap = new WeakMapCtor();

        const startActivity: any = LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG
            ? instrumentation!.startActivity
            : undefined;

        let foreignCallablePushErrorTarget: CallablePushErrorTarget;
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
        let foreignCallableGetLazyPropertyDescriptorStateByTarget: CallableGetLazyPropertyDescriptorStateByTarget;
        let foreignCallableGetTargetIntegrityTraits: CallableGetTargetIntegrityTraits;
        let foreignCallableGetToStringTagOfTarget: CallableGetToStringTagOfTarget;
        let foreignCallableInstallErrorPrepareStackTrace: CallableInstallErrorPrepareStackTrace;
        let foreignCallableIsTargetLive: CallableIsTargetLive;
        let foreignCallableIsTargetRevoked: CallableIsTargetRevoked;
        let foreignCallableSerializeTarget: CallableSerializeTarget;
        let foreignCallableSetLazyPropertyDescriptorStateByTarget: CallableSetLazyPropertyDescriptorStateByTarget;
        let foreignCallableBatchGetPrototypeOfAndGetOwnPropertyDescriptors: CallableBatchGetPrototypeOfAndGetOwnPropertyDescriptors;
        let foreignCallableBatchGetPrototypeOfWhenHasNoOwnProperty: CallableBatchGetPrototypeOfWhenHasNoOwnProperty;
        let foreignCallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor: CallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor;

        let lastProxyTrapCalled = ProxyHandlerTraps.None;
        let nearMembraneSymbolFlag = false;
        let selectedTarget: undefined | ProxyTarget;

        const activateLazyOwnPropertyDefinition = IS_IN_SHADOW_REALM
            ? (target: object, key: PropertyKey, state: object) => {
                  state[key] = false;
                  const foreignTargetPointer = getTransferablePointer(target);
                  let safeDesc;
                  try {
                      foreignCallableGetOwnPropertyDescriptor(
                          foreignTargetPointer,
                          key,
                          (
                              _key,
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
                          }
                      );
                  } catch (error: any) {
                      const errorToThrow = selectedTarget ?? error;
                      selectedTarget = undefined;
                      throw errorToThrow;
                  }
                  if (safeDesc) {
                      ReflectDefineProperty(target, key, safeDesc);
                  } else {
                      delete target[key];
                  }
              }
            : noop;

        let checkDebugMode = LOCKER_DEBUGGABLE_FLAG
            ? () => {
                  try {
                      if (
                          ReflectApply(ObjectProtoHasOwnProperty, globalThisRef, [
                              LOCKER_DEBUG_MODE_SYMBOL,
                          ])
                      ) {
                          checkDebugMode = () => true;
                          installErrorPrepareStackTrace();
                          foreignCallableInstallErrorPrepareStackTrace();
                      }
                  } catch {
                      checkDebugMode = alwaysFalse;
                  }
                  return false;
              }
            : alwaysFalse;

        function copyForeignOwnPropertyDescriptorsAndPrototypeToShadowTarget(
            foreignTargetPointer: Pointer,
            shadowTarget: ShadowTarget
        ): void {
            let activity: any;
            if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                activity = startActivity(
                    'copyForeignOwnPropertyDescriptorsAndPrototypeToShadowTarget'
                );
            }
            let protoPointerOrNull;
            try {
                protoPointerOrNull = foreignCallableBatchGetPrototypeOfAndGetOwnPropertyDescriptors(
                    foreignTargetPointer,
                    (...descriptorTuples) => {
                        const descriptors: PropertyDescriptorMap = {};
                        for (let i = 0, { length } = descriptorTuples; i < length; i += 7) {
                            const key = descriptorTuples[i] as PropertyKey;
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
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity.error(errorToThrow);
                }
                throw errorToThrow;
            }
            let proto: any;
            if (typeof protoPointerOrNull === 'function') {
                protoPointerOrNull();
                proto = selectedTarget;
                selectedTarget = undefined;
            } else {
                proto = null;
            }
            ReflectSetPrototypeOf(shadowTarget, proto);
            if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                activity.stop();
            }
        }

        function createApplyOrConstructTrapForZeroOrMoreArgs(proxyTrapEnum: ProxyHandlerTraps) {
            const isApplyTrap = proxyTrapEnum & ProxyHandlerTraps.Apply;
            const activityName = `[Native Reflect.${
                isApplyTrap ? 'apply' : 'construct'
            }(args count: 0)]`;
            const arityToApplyOrConstructTrapNameRegistry = isApplyTrap
                ? arityToApplyTrapNameRegistry
                : arityToConstructTrapNameRegistry;
            const foreignCallableApplyOrConstruct = isApplyTrap
                ? foreignCallableApply
                : foreignCallableConstruct;
            return function applyOrConstructTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                thisArgOrArgs: any,
                argsOrNewTarget: any
            ) {
                lastProxyTrapCalled = proxyTrapEnum;
                const args = isApplyTrap ? argsOrNewTarget : thisArgOrArgs;
                const { length } = args;
                if (length !== 0) {
                    return this[
                        arityToApplyOrConstructTrapNameRegistry[length] ??
                            arityToApplyOrConstructTrapNameRegistry.n
                    ](shadowTarget, thisArgOrArgs, argsOrNewTarget);
                }
                let activity: any;
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity = startActivity(activityName);
                }
                // @ts-ignore: Prevent private property access error.
                const { foreignTargetPointer } = this;
                const thisArgOrNewTarget = isApplyTrap ? thisArgOrArgs : argsOrNewTarget;
                let result: any;
                try {
                    const pointerOrPrimitive = foreignCallableApplyOrConstruct(
                        foreignTargetPointer,
                        // Inline getTransferableValue().
                        (typeof thisArgOrNewTarget === 'object' && thisArgOrNewTarget !== null) ||
                            typeof thisArgOrNewTarget === 'function'
                            ? getTransferablePointer(thisArgOrNewTarget)
                            : // Intentionally ignoring `document.all`.
                            // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                            // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                            typeof thisArgOrNewTarget === 'undefined'
                            ? undefined
                            : thisArgOrNewTarget
                    );
                    if (typeof pointerOrPrimitive === 'function') {
                        pointerOrPrimitive();
                        result = selectedTarget;
                        selectedTarget = undefined;
                    } else {
                        result = pointerOrPrimitive;
                    }
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                        activity.error(errorToThrow);
                    }
                    throw errorToThrow;
                }
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity.stop();
                }
                return result;
            };
        }

        function createApplyOrConstructTrapForOneOrMoreArgs(proxyTrapEnum: ProxyHandlerTraps) {
            const isApplyTrap = proxyTrapEnum & ProxyHandlerTraps.Apply;
            const activityName = `[Native Reflect.${
                isApplyTrap ? 'apply' : 'construct'
            }(args count: 1)]`;
            const arityToApplyOrConstructTrapNameRegistry = isApplyTrap
                ? arityToApplyTrapNameRegistry
                : arityToConstructTrapNameRegistry;
            const foreignCallableApplyOrConstruct = isApplyTrap
                ? foreignCallableApply
                : foreignCallableConstruct;
            return function applyOrConstructTrapForOneOrMoreArgs(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                thisArgOrArgs: any,
                argsOrNewTarget: any
            ) {
                lastProxyTrapCalled = proxyTrapEnum;
                const args = isApplyTrap ? argsOrNewTarget : thisArgOrArgs;
                const { length } = args;
                if (length !== 1) {
                    return this[
                        arityToApplyOrConstructTrapNameRegistry[length] ??
                            arityToApplyOrConstructTrapNameRegistry.n
                    ](shadowTarget, thisArgOrArgs, argsOrNewTarget);
                }
                let activity: any;
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity = startActivity(activityName);
                }
                // @ts-ignore: Prevent private property access error.
                const { foreignTargetPointer } = this;
                const thisArgOrNewTarget = isApplyTrap ? thisArgOrArgs : argsOrNewTarget;
                let result: any;
                try {
                    const { 0: arg0 } = args;
                    const pointerOrPrimitive = foreignCallableApplyOrConstruct(
                        foreignTargetPointer,
                        // Inline getTransferableValue().
                        (typeof thisArgOrNewTarget === 'object' && thisArgOrNewTarget !== null) ||
                            typeof thisArgOrNewTarget === 'function'
                            ? getTransferablePointer(thisArgOrNewTarget)
                            : // Intentionally ignoring `document.all`.
                            // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                            // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                            typeof thisArgOrNewTarget === 'undefined'
                            ? undefined
                            : thisArgOrNewTarget,
                        // Inline getTransferableValue().
                        (typeof arg0 === 'object' && arg0 !== null) || typeof arg0 === 'function'
                            ? getTransferablePointer(arg0)
                            : // Intentionally ignoring `document.all`.
                            // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                            // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                            typeof arg0 === 'undefined'
                            ? undefined
                            : arg0
                    );
                    if (typeof pointerOrPrimitive === 'function') {
                        pointerOrPrimitive();
                        result = selectedTarget;
                        selectedTarget = undefined;
                    } else {
                        result = pointerOrPrimitive;
                    }
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                        activity.error(errorToThrow);
                    }
                    throw errorToThrow;
                }
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity.stop();
                }
                return result;
            };
        }

        function createApplyOrConstructTrapForTwoOrMoreArgs(proxyTrapEnum: ProxyHandlerTraps) {
            const isApplyTrap = proxyTrapEnum & ProxyHandlerTraps.Apply;
            const activityName = `[Native Reflect.${
                isApplyTrap ? 'apply' : 'construct'
            }(args count: 2)]`;
            const arityToApplyOrConstructTrapNameRegistry = isApplyTrap
                ? arityToApplyTrapNameRegistry
                : arityToConstructTrapNameRegistry;
            const foreignCallableApplyOrConstruct = isApplyTrap
                ? foreignCallableApply
                : foreignCallableConstruct;
            return function applyOrConstructTrapForTwoOrMoreArgs(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                thisArgOrArgs: any,
                argsOrNewTarget: any
            ) {
                lastProxyTrapCalled = proxyTrapEnum;
                const args = isApplyTrap ? argsOrNewTarget : thisArgOrArgs;
                const { length } = args;
                if (length !== 2) {
                    return this[
                        arityToApplyOrConstructTrapNameRegistry[length] ??
                            arityToApplyOrConstructTrapNameRegistry.n
                    ](shadowTarget, thisArgOrArgs, argsOrNewTarget);
                }
                let activity: any;
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity = startActivity(activityName);
                }
                // @ts-ignore: Prevent private property access error.
                const { foreignTargetPointer } = this;
                const thisArgOrNewTarget = isApplyTrap ? thisArgOrArgs : argsOrNewTarget;
                let result: any;
                try {
                    const { 0: arg0, 1: arg1 } = args;
                    const pointerOrPrimitive = foreignCallableApplyOrConstruct(
                        foreignTargetPointer,
                        // Inline getTransferableValue().
                        (typeof thisArgOrNewTarget === 'object' && thisArgOrNewTarget !== null) ||
                            typeof thisArgOrNewTarget === 'function'
                            ? getTransferablePointer(thisArgOrNewTarget)
                            : // Intentionally ignoring `document.all`.
                            // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                            // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                            typeof thisArgOrNewTarget === 'undefined'
                            ? undefined
                            : thisArgOrNewTarget,
                        // Inline getTransferableValue().
                        (typeof arg0 === 'object' && arg0 !== null) || typeof arg0 === 'function'
                            ? getTransferablePointer(arg0)
                            : // Intentionally ignoring `document.all`.
                            // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                            // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                            typeof arg0 === 'undefined'
                            ? undefined
                            : arg0,
                        // Inline getTransferableValue().
                        (typeof arg1 === 'object' && arg1 !== null) || typeof arg1 === 'function'
                            ? getTransferablePointer(arg1)
                            : // Intentionally ignoring `document.all`.
                            // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                            // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                            typeof arg1 === 'undefined'
                            ? undefined
                            : arg1
                    );
                    if (typeof pointerOrPrimitive === 'function') {
                        pointerOrPrimitive();
                        result = selectedTarget;
                        selectedTarget = undefined;
                    } else {
                        result = pointerOrPrimitive;
                    }
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                        activity.error(errorToThrow);
                    }
                    throw errorToThrow;
                }
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity.stop();
                }
                return result;
            };
        }

        function createApplyOrConstructTrapForThreeOrMoreArgs(proxyTrapEnum: ProxyHandlerTraps) {
            const isApplyTrap = proxyTrapEnum & ProxyHandlerTraps.Apply;
            const activityName = `[Native Reflect.${
                isApplyTrap ? 'apply' : 'construct'
            }(args count: 3)]`;
            const arityToApplyOrConstructTrapNameRegistry = isApplyTrap
                ? arityToApplyTrapNameRegistry
                : arityToConstructTrapNameRegistry;
            const foreignCallableApplyOrConstruct = isApplyTrap
                ? foreignCallableApply
                : foreignCallableConstruct;
            return function applyOrConstructTrapForTwoOrMoreArgs(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                thisArgOrArgs: any,
                argsOrNewTarget: any
            ) {
                lastProxyTrapCalled = proxyTrapEnum;
                const args = isApplyTrap ? argsOrNewTarget : thisArgOrArgs;
                const { length } = args;
                if (length !== 3) {
                    return this[
                        arityToApplyOrConstructTrapNameRegistry[length] ??
                            arityToApplyOrConstructTrapNameRegistry.n
                    ](shadowTarget, thisArgOrArgs, argsOrNewTarget);
                }
                let activity: any;
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity = startActivity(activityName);
                }
                // @ts-ignore: Prevent private property access error.
                const { foreignTargetPointer } = this;
                const thisArgOrNewTarget = isApplyTrap ? thisArgOrArgs : argsOrNewTarget;
                let result: any;
                try {
                    const { 0: arg0, 1: arg1, 2: arg2 } = args;
                    const pointerOrPrimitive = foreignCallableApplyOrConstruct(
                        foreignTargetPointer,
                        // Inline getTransferableValue().
                        (typeof thisArgOrNewTarget === 'object' && thisArgOrNewTarget !== null) ||
                            typeof thisArgOrNewTarget === 'function'
                            ? getTransferablePointer(thisArgOrNewTarget)
                            : // Intentionally ignoring `document.all`.
                            // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                            // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                            typeof thisArgOrNewTarget === 'undefined'
                            ? undefined
                            : thisArgOrNewTarget,
                        // Inline getTransferableValue().
                        (typeof arg0 === 'object' && arg0 !== null) || typeof arg0 === 'function'
                            ? getTransferablePointer(arg0)
                            : // Intentionally ignoring `document.all`.
                            // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                            // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                            typeof arg0 === 'undefined'
                            ? undefined
                            : arg0,
                        // Inline getTransferableValue().
                        (typeof arg1 === 'object' && arg1 !== null) || typeof arg1 === 'function'
                            ? getTransferablePointer(arg1)
                            : // Intentionally ignoring `document.all`.
                            // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                            // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                            typeof arg1 === 'undefined'
                            ? undefined
                            : arg1,
                        // Inline getTransferableValue().
                        (typeof arg2 === 'object' && arg2 !== null) || typeof arg2 === 'function'
                            ? getTransferablePointer(arg2)
                            : // Intentionally ignoring `document.all`.
                            // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                            // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                            typeof arg2 === 'undefined'
                            ? undefined
                            : arg2
                    );
                    if (typeof pointerOrPrimitive === 'function') {
                        pointerOrPrimitive();
                        result = selectedTarget;
                        selectedTarget = undefined;
                    } else {
                        result = pointerOrPrimitive;
                    }
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                        activity.error(errorToThrow);
                    }
                    throw errorToThrow;
                }
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity.stop();
                }
                return result;
            };
        }

        function createApplyOrConstructTrapForFourOrMoreArgs(proxyTrapEnum: ProxyHandlerTraps) {
            const isApplyTrap = proxyTrapEnum & ProxyHandlerTraps.Apply;
            const activityName = `[Native Reflect.${
                isApplyTrap ? 'apply' : 'construct'
            }(args count: 4)]`;
            const arityToApplyOrConstructTrapNameRegistry = isApplyTrap
                ? arityToApplyTrapNameRegistry
                : arityToConstructTrapNameRegistry;
            const foreignCallableApplyOrConstruct = isApplyTrap
                ? foreignCallableApply
                : foreignCallableConstruct;
            return function applyOrConstructTrapForTwoOrMoreArgs(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                thisArgOrArgs: any,
                argsOrNewTarget: any
            ) {
                lastProxyTrapCalled = proxyTrapEnum;
                const args = isApplyTrap ? argsOrNewTarget : thisArgOrArgs;
                const { length } = args;
                if (length !== 4) {
                    return this[
                        arityToApplyOrConstructTrapNameRegistry[length] ??
                            arityToApplyOrConstructTrapNameRegistry.n
                    ](shadowTarget, thisArgOrArgs, argsOrNewTarget);
                }
                let activity: any;
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity = startActivity(activityName);
                }
                // @ts-ignore: Prevent private property access error.
                const { foreignTargetPointer } = this;
                const thisArgOrNewTarget = isApplyTrap ? thisArgOrArgs : argsOrNewTarget;
                let result: any;
                try {
                    const { 0: arg0, 1: arg1, 2: arg2, 3: arg3 } = args;
                    const pointerOrPrimitive = foreignCallableApplyOrConstruct(
                        foreignTargetPointer,
                        // Inline getTransferableValue().
                        (typeof thisArgOrNewTarget === 'object' && thisArgOrNewTarget !== null) ||
                            typeof thisArgOrNewTarget === 'function'
                            ? getTransferablePointer(thisArgOrNewTarget)
                            : // Intentionally ignoring `document.all`.
                            // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                            // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                            typeof thisArgOrNewTarget === 'undefined'
                            ? undefined
                            : thisArgOrNewTarget,
                        // Inline getTransferableValue().
                        (typeof arg0 === 'object' && arg0 !== null) || typeof arg0 === 'function'
                            ? getTransferablePointer(arg0)
                            : // Intentionally ignoring `document.all`.
                            // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                            // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                            typeof arg0 === 'undefined'
                            ? undefined
                            : arg0,
                        // Inline getTransferableValue().
                        (typeof arg1 === 'object' && arg1 !== null) || typeof arg1 === 'function'
                            ? getTransferablePointer(arg1)
                            : // Intentionally ignoring `document.all`.
                            // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                            // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                            typeof arg1 === 'undefined'
                            ? undefined
                            : arg1,
                        // Inline getTransferableValue().
                        (typeof arg2 === 'object' && arg2 !== null) || typeof arg2 === 'function'
                            ? getTransferablePointer(arg2)
                            : // Intentionally ignoring `document.all`.
                            // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                            // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                            typeof arg2 === 'undefined'
                            ? undefined
                            : arg2,
                        // Inline getTransferableValue().
                        (typeof arg3 === 'object' && arg3 !== null) || typeof arg3 === 'function'
                            ? getTransferablePointer(arg3)
                            : // Intentionally ignoring `document.all`.
                            // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                            // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                            typeof arg3 === 'undefined'
                            ? undefined
                            : arg3
                    );
                    if (typeof pointerOrPrimitive === 'function') {
                        pointerOrPrimitive();
                        result = selectedTarget;
                        selectedTarget = undefined;
                    } else {
                        result = pointerOrPrimitive;
                    }
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                        activity.error(errorToThrow);
                    }
                    throw errorToThrow;
                }
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity.stop();
                }
                return result;
            };
        }

        function createApplyOrConstructTrapForAnyNumberOfArgs(proxyTrapEnum: ProxyHandlerTraps) {
            const isApplyTrap = proxyTrapEnum & ProxyHandlerTraps.Apply;
            const nativeMethodName = isApplyTrap ? 'apply' : 'construct';
            const foreignCallableApplyOrConstruct = isApplyTrap
                ? foreignCallableApply
                : foreignCallableConstruct;
            return function applyOrConstructTrapForAnyNumberOfArgs(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                thisArgOrArgs: any,
                argsOrNewTarget: any
            ) {
                lastProxyTrapCalled = proxyTrapEnum;

                // @ts-ignore: Prevent private property access error.
                const { foreignTargetPointer } = this;
                const args = isApplyTrap ? argsOrNewTarget : thisArgOrArgs;
                const { length } = args;
                let activity: any;
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity = startActivity(
                        `[Native Reflect.${nativeMethodName}(args count: ${length})]`
                    );
                }
                const thisArgOrNewTarget = isApplyTrap ? thisArgOrArgs : argsOrNewTarget;
                let combinedOffset = 2;
                const combinedArgs = new ArrayCtor(length + combinedOffset);
                combinedArgs[0] = foreignTargetPointer;
                let result: any;
                try {
                    combinedArgs[1] =
                        (typeof thisArgOrNewTarget === 'object' && thisArgOrNewTarget !== null) ||
                        typeof thisArgOrNewTarget === 'function'
                            ? getTransferablePointer(thisArgOrNewTarget)
                            : // Intentionally ignoring `document.all`.
                            // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                            // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                            typeof thisArgOrNewTarget === 'undefined'
                            ? undefined
                            : thisArgOrNewTarget;
                    for (let i = 0; i < length; i += 1) {
                        const arg = args[i];
                        // Inlining `getTransferableValue()`.
                        combinedArgs[combinedOffset++] =
                            (typeof arg === 'object' && arg !== null) || typeof arg === 'function'
                                ? getTransferablePointer(arg)
                                : // Intentionally ignoring `document.all`.
                                // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                                // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                                typeof arg === 'undefined'
                                ? undefined
                                : arg;
                    }
                    const pointerOrPrimitive: PointerOrPrimitive = ReflectApply(
                        foreignCallableApplyOrConstruct,
                        undefined,
                        combinedArgs
                    );
                    if (typeof pointerOrPrimitive === 'function') {
                        pointerOrPrimitive();
                        result = selectedTarget;
                        selectedTarget = undefined;
                    } else {
                        result = pointerOrPrimitive;
                    }
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                        activity.error(errorToThrow);
                    }
                    throw errorToThrow;
                }
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity.stop();
                }
                return result;
            };
        }

        function createDescriptorFromMeta(
            configurable: boolean | symbol,
            enumerable: boolean | symbol,
            writable: boolean | symbol,
            valuePointerOrPrimitive: PointerOrPrimitive,
            getterPointerOrPrimitive: PointerOrPrimitive,
            setterPointerOrPrimitive: PointerOrPrimitive
        ): PropertyDescriptor {
            const safeDesc = { __proto__: null } as PropertyDescriptor;
            if (configurable !== LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL) {
                safeDesc.configurable = configurable as boolean;
            }
            if (enumerable !== LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL) {
                safeDesc.enumerable = enumerable as boolean;
            }
            if (writable !== LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL) {
                safeDesc.writable = writable as boolean;
            }
            if (getterPointerOrPrimitive !== LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL) {
                let getter: (() => any) | undefined;
                if (typeof getterPointerOrPrimitive === 'function') {
                    getterPointerOrPrimitive();
                    getter = selectedTarget as () => any;
                    selectedTarget = undefined;
                }
                safeDesc.get = getter;
            }
            if (setterPointerOrPrimitive !== LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL) {
                let setter: ((value: any) => void) | undefined;
                if (typeof setterPointerOrPrimitive === 'function') {
                    setterPointerOrPrimitive();
                    setter = selectedTarget as (value: any) => void;
                    selectedTarget = undefined;
                }
                safeDesc.set = setter;
            }
            if (valuePointerOrPrimitive !== LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL) {
                let value: any;
                if (typeof valuePointerOrPrimitive === 'function') {
                    valuePointerOrPrimitive();
                    value = selectedTarget;
                    selectedTarget = undefined;
                } else {
                    value = valuePointerOrPrimitive;
                }
                safeDesc.value = value;
            }
            return safeDesc;
        }

        function createPointer(originalTarget: ProxyTarget | undefined): () => void {
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

        const getLazyPropertyDescriptorStateByTarget = IS_IN_SHADOW_REALM
            ? (target: ProxyTarget): object | undefined => {
                  let state: any = ReflectApply(
                      WeakMapProtoGet,
                      localProxyTargetToLazyPropertyDescriptorStateByTargetMap,
                      [target]
                  );
                  if (state === undefined) {
                      const statePointerOrUndefined =
                          foreignCallableGetLazyPropertyDescriptorStateByTarget(
                              getTransferablePointer(target)
                          );
                      if (typeof statePointerOrUndefined === 'function') {
                          statePointerOrUndefined();
                          state = selectedTarget;
                          selectedTarget = undefined;
                          if (state) {
                              ReflectApply(
                                  WeakMapProtoSet,
                                  localProxyTargetToLazyPropertyDescriptorStateByTargetMap,
                                  [target, state]
                              );
                          }
                      }
                  }
                  return state;
              }
            : noop;

        function getTransferablePointer(
            originalTarget: ProxyTarget,
            foreignCallablePusher = foreignCallablePushTarget
        ): Pointer {
            let proxyPointer = ReflectApply(WeakMapProtoGet, proxyTargetToPointerMap, [
                originalTarget,
            ]);
            if (proxyPointer) {
                return proxyPointer;
            }
            const distortedTarget: ProxyTarget = IS_IN_SHADOW_REALM
                ? originalTarget
                : distortionCallback(originalTarget);
            // If a distortion entry is found, it must be a valid proxy target.
            if (
                distortedTarget !== originalTarget &&
                typeof distortedTarget !== typeof originalTarget
            ) {
                // eslint-disable-next-line no-unsafe-finally
                throw new TypeErrorCtor(`Invalid distortion ${originalTarget}.`);
            }
            let targetFunctionArity: number | undefined;
            let targetFunctionName: string | undefined;
            let targetTraits = TargetTraits.IsObject;
            try {
                if (isArrayOrThrowForRevoked(distortedTarget)) {
                    targetTraits = TargetTraits.IsArray;
                }
            } catch {
                targetTraits = TargetTraits.Revoked;
            }
            if (typeof distortedTarget === 'function') {
                targetFunctionArity = 0;
                targetTraits = TargetTraits.IsFunction;
                // Detect arrow functions.
                try {
                    if (!('prototype' in distortedTarget)) {
                        targetTraits |= TargetTraits.IsArrowFunction;
                    }
                    const safeLengthDesc = ReflectGetOwnPropertyDescriptor(
                        originalTarget,
                        'length'
                    );
                    if (safeLengthDesc) {
                        ReflectSetPrototypeOf(safeLengthDesc, null);
                        const { value: safeLengthDescValue } = safeLengthDesc;
                        if (typeof safeLengthDescValue === 'number') {
                            targetFunctionArity = safeLengthDescValue;
                        }
                    }
                    const safeNameDesc = DEV_MODE
                        ? ReflectGetOwnPropertyDescriptor(originalTarget, 'name')
                        : undefined;
                    if (safeNameDesc) {
                        ReflectSetPrototypeOf(safeNameDesc, null);
                        const { value: safeNameDescValue } = safeNameDesc;
                        if (typeof safeNameDescValue === 'string') {
                            targetFunctionName = safeNameDescValue;
                        }
                    }
                    // eslint-disable-next-line no-empty
                } catch {}
            }
            proxyPointer = foreignCallablePusher(
                createPointer(distortedTarget),
                targetTraits,
                targetFunctionArity,
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

        const installPropertyDescriptorMethodWrappers = IS_IN_SHADOW_REALM
            ? (unforgeableGlobalThisKeys?: PropertyKeys) => {
                  if (installedPropertyDescriptorMethodWrappersFlag) {
                      return;
                  }
                  installedPropertyDescriptorMethodWrappersFlag = true;
                  // We wrap property descriptor methods to activate lazy
                  // descriptors and/or workaround browser bugs. The following
                  // methods are wrapped:
                  //   Object.getOwnPropertyDescriptors()
                  //   Object.getOwnPropertyDescriptor()
                  //   Reflect.defineProperty()
                  //   Reflect.getOwnPropertyDescriptor()
                  //   Object.prototype.__defineGetter__()
                  //   Object.prototype.__defineSetter__()
                  //   Object.prototype.__lookupGetter__()
                  //   Object.prototype.__lookupSetter__()
                  //
                  // Chromium based browsers have a bug that nulls the result
                  // of `window` getters in detached iframes when the property
                  // descriptor of `window.window` is retrieved.
                  // https://bugs.chromium.org/p/chromium/issues/detail?id=1305302
                  //
                  // Methods may be poisoned when they interact with the `window`
                  // object and retrieve property descriptors, like 'window',
                  // that contain the `window` object itself. The following
                  // built-in methods are susceptible to this issue:
                  //     console.log(window);
                  //     Object.getOwnPropertyDescriptors(window);
                  //     Object.getOwnPropertyDescriptor(window, 'window');
                  //     Reflect.getOwnPropertyDescriptor(window, 'window');
                  //     window.__lookupGetter__('window');
                  //     window.__lookupSetter__('window');
                  //
                  // We side step issues with `console` by mapping it to the
                  // primary realm's `console`. Since we're already wrapping
                  // property descriptor methods to activate lazy descriptors
                  // we use the wrapper to workaround the `window` getter
                  // nulling bug.
                  const shouldFixChromeBug =
                      isArrayOrThrowForRevoked(unforgeableGlobalThisKeys) &&
                      unforgeableGlobalThisKeys.length > 0;

                  // Lazily populated by `getUnforgeableGlobalThisGetter()`;
                  const keyToGlobalThisGetterRegistry = shouldFixChromeBug
                      ? { __proto__: null }
                      : undefined;

                  const getFixedDescriptor = shouldFixChromeBug
                      ? (target: any, key: PropertyKey): PropertyDescriptor | undefined =>
                            ReflectApply(ArrayProtoIncludes, unforgeableGlobalThisKeys, [key])
                                ? {
                                      configurable: false,
                                      enumerable: ReflectApply(
                                          ObjectProtoPropertyIsEnumerable,
                                          target,
                                          [key]
                                      ),
                                      get: getUnforgeableGlobalThisGetter!(key),
                                      set: undefined,
                                  }
                                : ReflectGetOwnPropertyDescriptor(target, key)
                      : undefined;

                  const getUnforgeableGlobalThisGetter = shouldFixChromeBug
                      ? (key: PropertyKey): (() => typeof globalThis) => {
                            let globalThisGetter = keyToGlobalThisGetterRegistry![key];
                            if (globalThisGetter === undefined) {
                                // Use `FunctionProtoBind` to make the getter
                                // look native.
                                globalThisGetter = ReflectApply(
                                    FunctionProtoBind,
                                    unboundGlobalThisGetter,
                                    []
                                );
                                // Preserve identity continuity of getters.
                                keyToGlobalThisGetterRegistry![key] = globalThisGetter;
                            }
                            return globalThisGetter;
                        }
                      : undefined;

                  const lookupFixedGetter = shouldFixChromeBug
                      ? (target: any, key: PropertyKey): (() => any | undefined) =>
                            ReflectApply(ArrayProtoIncludes, unforgeableGlobalThisKeys, [key])
                                ? getUnforgeableGlobalThisGetter!(key)
                                : ReflectApply(ObjectProto__lookupGetter__, target, [key])
                      : undefined;

                  const lookupFixedSetter = shouldFixChromeBug
                      ? (target: any, key: PropertyKey): (() => any | undefined) =>
                            ReflectApply(ArrayProtoIncludes, unforgeableGlobalThisKeys, [key])
                                ? undefined
                                : ReflectApply(ObjectProto__lookupSetter__, target, [key])
                      : undefined;

                  const unboundGlobalThisGetter = shouldFixChromeBug
                      ? () => globalThisRef
                      : undefined;

                  const wrapDefineAccessOrProperty = (originalFunc: Function) => {
                      const { length: originalFuncLength } = originalFunc;
                      // `__defineGetter__()` and `__defineSetter__()` have
                      // function lengths of 2 while `Reflect.defineProperty()`
                      // has a function length of 3.
                      const useThisArgAsTarget = originalFuncLength === 2;
                      return new ProxyCtor(originalFunc, {
                          apply(_originalFunc: Function, thisArg: any, args: any[]) {
                              if (args.length >= originalFuncLength) {
                                  const target = useThisArgAsTarget ? thisArg : args[0];
                                  if (
                                      (typeof target === 'object' && target !== null) ||
                                      typeof target === 'function'
                                  ) {
                                      const key = useThisArgAsTarget ? args[0] : args[1];
                                      const state = getLazyPropertyDescriptorStateByTarget(target);
                                      if (state?.[key]) {
                                          // Activate the descriptor by triggering
                                          // its getter.
                                          ReflectGet(target, key);
                                      }
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
                          apply(_originalFunc: Function, thisArg: any, args: [key: PropertyKey]) {
                              if (
                                  args.length &&
                                  ((typeof thisArg === 'object' && thisArg !== null) ||
                                      typeof thisArg === 'function')
                              ) {
                                  const { 0: key } = args;
                                  const state = getLazyPropertyDescriptorStateByTarget(thisArg);
                                  if (state?.[key]) {
                                      // Activate the descriptor by triggering
                                      // its getter.
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
                              args: [target: object, key: PropertyKey]
                          ) {
                              if (args.length > 1) {
                                  const { 0: target, 1: key } = args;
                                  if (
                                      (typeof target === 'object' && target !== null) ||
                                      typeof target === 'function'
                                  ) {
                                      const state = getLazyPropertyDescriptorStateByTarget(target);
                                      if (state?.[key]) {
                                          // Activate the descriptor by triggering
                                          // its getter.
                                          ReflectGet(target, key);
                                      }
                                      if (shouldFixChromeBug && target === globalThisRef) {
                                          return getFixedDescriptor!(target, key);
                                      }
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
                              const target: ProxyTarget = args.length
                                  ? (args[0] as any)
                                  : undefined;
                              if (
                                  !(
                                      (typeof target === 'object' && target !== null) ||
                                      typeof target === 'function'
                                  )
                              ) {
                                  // Defer to native method to throw exception.
                                  return ReflectApply(originalFunc, thisArg, args);
                              }
                              const state = getLazyPropertyDescriptorStateByTarget(target);
                              const isFixingChromeBug =
                                  target === globalThisRef && shouldFixChromeBug;
                              const unsafeDescMap = isFixingChromeBug
                                  ? // Create an empty property descriptor map
                                    // to populate with curated descriptors.
                                    ({} as PropertyDescriptorMap)
                                  : // Since this is not a global object it is
                                    // safe to use the native method.
                                    ReflectApply(originalFunc, thisArg, args);
                              if (!isFixingChromeBug && state === undefined) {
                                  // Exit early if the target is not a global
                                  // object and there are no lazy descriptors.
                                  return unsafeDescMap;
                              }
                              const ownKeys = ReflectOwnKeys(
                                  isFixingChromeBug ? target : unsafeDescMap
                              );
                              for (let i = 0, { length } = ownKeys; i < length; i += 1) {
                                  const ownKey = ownKeys[i];
                                  const isLazyProp = !!state?.[ownKey];
                                  if (isLazyProp) {
                                      // Activate the descriptor by triggering
                                      // its getter.
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
            : noop;

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
            key: PropertyKey
        ): PropertyDescriptor | undefined {
            let activity: any;
            if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                activity = startActivity('lookupForeignDescriptor');
            }
            let protoPointerOrNull;
            let safeDesc;
            try {
                protoPointerOrNull =
                    foreignCallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor(
                        foreignTargetPointer,
                        key,
                        (
                            _key,
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
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity.error(errorToThrow);
                }
                throw errorToThrow;
            }
            if (safeDesc === undefined) {
                // Avoiding calling the has trap for any proto chain operation,
                // instead we implement the regular logic here in this trap.
                let currentObject: any;
                if (typeof protoPointerOrNull === 'function') {
                    protoPointerOrNull();
                    currentObject = selectedTarget;
                    selectedTarget = undefined;
                } else {
                    currentObject = protoPointerOrNull;
                }
                while (currentObject) {
                    safeDesc = ReflectGetOwnPropertyDescriptor(currentObject, key);
                    if (safeDesc) {
                        ReflectSetPrototypeOf(safeDesc, null);
                        break;
                    }
                    currentObject = ReflectGetPrototypeOf(currentObject);
                }
            }
            if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                activity.stop();
            }
            return safeDesc;
        }

        function passthruForeignCallableSet(
            foreignTargetPointer: Pointer,
            key: PropertyKey,
            value: any,
            receiver: any
        ): boolean {
            let activity: any;
            if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                activity = startActivity('[Native Reflect.set]');
            }
            // Inline getTransferableValue().
            const transferableValue =
                (typeof value === 'object' && value !== null) || typeof value === 'function'
                    ? getTransferablePointer(value)
                    : value;
            const transferableReceiver = getTransferablePointer(receiver);
            let result = false;
            try {
                result = foreignCallableSet(
                    foreignTargetPointer,
                    key,
                    transferableValue,
                    transferableReceiver
                );
            } catch (error: any) {
                const errorToThrow = selectedTarget ?? error;
                selectedTarget = undefined;
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity.error(errorToThrow);
                }
                throw errorToThrow;
            }
            if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                activity.stop();
            }
            return result;
        }

        function passthruForeignTraversedSet(
            foreignTargetPointer: Pointer,
            shadowTarget: ShadowTarget,
            key: PropertyKey,
            value: any,
            receiver: any
        ): boolean {
            let activity: any;
            if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                activity = startActivity('passthruForeignTraversedSet');
            }
            let result: boolean | undefined;
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
                        result = true;
                    } else {
                        result = false;
                    }
                } else if (safeDesc.writable === false) {
                    result = false;
                }
            }
            // Exit early if receiver is not object like.
            if (
                result === undefined &&
                !(
                    (typeof receiver === 'object' && receiver !== null) ||
                    typeof receiver === 'function'
                )
            ) {
                result = false;
            }
            const safeReceiverDesc =
                result === undefined ? ReflectGetOwnPropertyDescriptor(receiver, key) : undefined;
            if (safeReceiverDesc) {
                ReflectSetPrototypeOf(safeReceiverDesc, null);
                // Exit early for accessor descriptors or non-writable data
                // descriptors.
                if (
                    'get' in safeReceiverDesc ||
                    'set' in safeReceiverDesc ||
                    safeReceiverDesc.writable === false
                ) {
                    result = false;
                } else {
                    // Setting the descriptor with only a value entry should not
                    // affect existing descriptor traits.
                    ReflectDefineProperty(receiver, key, {
                        __proto__: null,
                        value,
                    } as PropertyDescriptor);
                    result = true;
                }
            } else if (result === undefined) {
                // `ReflectDefineProperty()` and `ReflectSet()` both are expected
                // to return `false` when attempting to add a new property if the
                // receiver is not extensible.
                result = ReflectDefineProperty(receiver, key, {
                    __proto__: null,
                    configurable: true,
                    enumerable: true,
                    value,
                    writable: true,
                } as PropertyDescriptor);
            }
            if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                activity.stop();
            }
            return result;
        }

        function pushErrorAcrossBoundary(error: any): any {
            if (LOCKER_DEBUGGABLE_FLAG) {
                checkDebugMode();
            }
            // Inline getTransferableValue().
            if ((typeof error === 'object' && error !== null) || typeof error === 'function') {
                const foreignErrorPointer = getTransferablePointer(
                    error,
                    foreignCallablePushErrorTarget
                );
                foreignErrorPointer();
            }
            return error;
        }

        function pushTarget(
            foreignTargetPointer: () => void,
            foreignTargetTraits: TargetTraits,
            foreignTargetFunctionArity: number | undefined,
            foreignTargetFunctionName: string | undefined
        ): Pointer {
            const { proxy } = new BoundaryProxyHandler(
                foreignTargetPointer,
                foreignTargetTraits,
                foreignTargetFunctionArity,
                foreignTargetFunctionName
            );
            ReflectApply(WeakMapProtoSet, proxyTargetToPointerMap, [proxy, foreignTargetPointer]);
            return createPointer(proxy);
        }

        const setLazyPropertyDescriptorStateByTarget = IS_IN_SHADOW_REALM
            ? (target: ProxyTarget, state: object) => {
                  ReflectApply(
                      WeakMapProtoSet,
                      localProxyTargetToLazyPropertyDescriptorStateByTargetMap,
                      [target, state]
                  );
                  foreignCallableSetLazyPropertyDescriptorStateByTarget(
                      getTransferablePointer(target),
                      getTransferablePointer(state)
                  );
              }
            : noop;

        class BoundaryProxyHandler implements ProxyHandler<ShadowTarget> {
            // public fields
            apply: ProxyHandler<ShadowTarget>['apply'] | undefined;

            construct: ProxyHandler<ShadowTarget>['construct'] | undefined;

            defineProperty: ProxyHandler<ShadowTarget>['defineProperty'];

            deleteProperty: ProxyHandler<ShadowTarget>['deleteProperty'];

            get: ProxyHandler<ShadowTarget>['get'];

            getOwnPropertyDescriptor: ProxyHandler<ShadowTarget>['getOwnPropertyDescriptor'];

            getPrototypeOf: ProxyHandler<ShadowTarget>['getPrototypeOf'];

            has: ProxyHandler<ShadowTarget>['has'];

            isExtensible: ProxyHandler<ShadowTarget>['isExtensible'];

            ownKeys: ProxyHandler<ShadowTarget>['ownKeys'];

            preventExtensions: ProxyHandler<ShadowTarget>['preventExtensions'];

            revoke: () => void;

            set: ProxyHandler<ShadowTarget>['set'];

            setPrototypeOf: ProxyHandler<ShadowTarget>['setPrototypeOf'];

            readonly proxy: ShadowTarget;

            private serializedValue: string | undefined;

            private staticToStringTag: string | undefined;

            // The membrane color help developers identify which side of the
            // membrane they are debugging.
            // @ts-ignore: Prevent 'has no initializer and is not definitely assigned in the constructor' error.
            private readonly color: string;

            private readonly foreignTargetPointer: Pointer;

            private readonly foreignTargetTraits: TargetTraits;

            private readonly nonConfigurableDescriptorCallback: CallableNonConfigurableDescriptorCallback;

            private readonly shadowTarget: ProxyTarget;

            // @ts-ignore: Prevent 'is declared but its value is never read' error.
            private readonly applyTrapForZeroOrMoreArgs: ProxyHandler<ShadowTarget>['apply'];

            // @ts-ignore: Prevent 'is declared but its value is never read' error.
            private readonly applyTrapForOneOrMoreArgs: ProxyHandler<ShadowTarget>['apply'];

            // @ts-ignore: Prevent 'is declared but its value is never read' error.
            private readonly applyTrapForTwoOrMoreArgs: ProxyHandler<ShadowTarget>['apply'];

            // @ts-ignore: Prevent 'is declared but its value is never read' error.
            private readonly applyTrapForThreeOrMoreArgs: ProxyHandler<ShadowTarget>['apply'];

            // @ts-ignore: Prevent 'is declared but its value is never read' error.
            private readonly applyTrapForFourOrMoreArgs: ProxyHandler<ShadowTarget>['apply'];

            // @ts-ignore: Prevent 'is declared but its value is never read' error.
            private readonly applyTrapForAnyNumberOfArgs: ProxyHandler<ShadowTarget>['apply'];

            // @ts-ignore: Prevent 'is declared but its value is never read' error.
            private readonly constructTrapForZeroOrMoreArgs: ProxyHandler<ShadowTarget>['construct'];

            // @ts-ignore: Prevent 'is declared but its value is never read' error.
            private readonly constructTrapForOneOrMoreArgs: ProxyHandler<ShadowTarget>['construct'];

            // @ts-ignore: Prevent 'is declared but its value is never read' error.
            private readonly constructTrapForTwoOrMoreArgs: ProxyHandler<ShadowTarget>['construct'];

            // @ts-ignore: Prevent 'is declared but its value is never read' error.
            private readonly constructTrapForThreeOrMoreArgs: ProxyHandler<ShadowTarget>['construct'];

            // @ts-ignore: Prevent 'is declared but its value is never read' error.
            private readonly constructTrapForFourOrMoreArgs: ProxyHandler<ShadowTarget>['construct'];

            // @ts-ignore: Prevent 'is declared but its value is never read' error.
            private readonly constructTrapForAnyNumberOfArgs: ProxyHandler<ShadowTarget>['construct'];

            constructor(
                foreignTargetPointer: Pointer,
                foreignTargetTraits: TargetTraits,
                foreignTargetFunctionArity: number | undefined,
                foreignTargetFunctionName: string | undefined
            ) {
                let shadowTarget: ShadowTarget;
                const isForeignTargetArray = foreignTargetTraits & TargetTraits.IsArray;
                const isForeignTargetFunction = foreignTargetTraits & TargetTraits.IsFunction;
                if (isForeignTargetFunction) {
                    // This shadow target is never invoked. It's needed to avoid
                    // proxy trap invariants. Because it's not invoked the code
                    // does not need to be instrumented for code coverage.
                    //
                    // istanbul ignore next
                    shadowTarget =
                        foreignTargetTraits & TargetTraits.IsArrowFunction
                            ? () => {}
                            : function () {};
                    if (DEV_MODE && typeof foreignTargetFunctionName === 'string') {
                        // This is only really needed for debugging,
                        // it helps to identify the proxy by name
                        ReflectDefineProperty(shadowTarget, 'name', {
                            __proto__: null,
                            value: foreignTargetFunctionName,
                        } as PropertyDescriptor);
                    }
                } else if (isForeignTargetArray) {
                    shadowTarget = [];
                } else {
                    shadowTarget = {};
                }
                const { proxy, revoke } = ProxyRevocable(shadowTarget, this);
                this.foreignTargetPointer = foreignTargetPointer;
                this.foreignTargetTraits = foreignTargetTraits;
                // Define in the BoundaryProxyHandler constructor so it is bound
                // to the BoundaryProxyHandler instance.
                this.nonConfigurableDescriptorCallback = (
                    key,
                    configurable,
                    enumerable,
                    writable,
                    valuePointer,
                    getPointer,
                    setPointer
                ) => {
                    // Update the descriptor to non-configurable on the shadow
                    // target.
                    ReflectDefineProperty(
                        this.shadowTarget,
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
                };
                this.proxy = proxy;
                this.revoke = revoke;
                this.serializedValue = undefined;
                this.shadowTarget = shadowTarget;
                this.staticToStringTag = undefined;
                // Define traps.
                if (isForeignTargetFunction) {
                    this.apply =
                        this[
                            arityToApplyTrapNameRegistry[foreignTargetFunctionArity as number] ??
                                arityToApplyTrapNameRegistry.n
                        ];
                    this.construct =
                        this[
                            arityToConstructTrapNameRegistry[
                                foreignTargetFunctionArity as number
                            ] ?? arityToConstructTrapNameRegistry.n
                        ];
                }
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
                if (foreignTargetTraits & TargetTraits.Revoked) {
                    // Future optimization: Hoping proxies with frozen handlers
                    // can be faster.
                    ObjectFreeze(this);
                    this.revoke();
                } else if (IS_IN_SHADOW_REALM) {
                    if (isForeignTargetArray) {
                        this.makeProxyLive();
                    }
                } else {
                    if (foreignTargetTraits & TargetTraits.IsObject) {
                        // Lazily define serializedValue.
                        let serializedValue: SerializedValue | undefined | symbol =
                            LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                        ReflectApply(ObjectProto__defineGetter__, this, [
                            'serializedValue',
                            () => {
                                if (
                                    serializedValue === LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL
                                ) {
                                    serializedValue = foreignCallableSerializeTarget(
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

            // Internal shadow realm side utilities:

            private makeProxyLive() {
                // Replace pending traps with live traps that can work with the
                // target without taking snapshots.
                this.deleteProperty = BoundaryProxyHandler.passthruDeletePropertyTrap;
                this.defineProperty = BoundaryProxyHandler.passthruDefinePropertyTrap;
                this.preventExtensions = BoundaryProxyHandler.passthruPreventExtensionsTrap;
                this.set = BoundaryProxyHandler.passthruSetTrap;
                this.setPrototypeOf = BoundaryProxyHandler.passthruSetPrototypeOfTrap;
                // Future optimization: Hoping proxies with frozen handlers can
                // be faster.
                ObjectFreeze(this);
            }

            private makeProxyStatic() {
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

                const { foreignTargetPointer, shadowTarget } = this;
                // We don't wrap `foreignCallableGetTargetIntegrityTraits()`
                // in a try-catch because it cannot throw.
                const targetIntegrityTraits =
                    foreignCallableGetTargetIntegrityTraits(foreignTargetPointer);
                if (targetIntegrityTraits & TargetIntegrityTraits.Revoked) {
                    // Future optimization: Hoping proxies with frozen
                    // handlers can be faster.
                    ObjectFreeze(this);
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
                    // We don't wrap `foreignCallableIsTargetRevoked()` in a
                    // try-catch because it cannot throw.
                    if (foreignCallableIsTargetRevoked(foreignTargetPointer)) {
                        // Future optimization: Hoping proxies with frozen
                        // handlers can be faster.
                        ObjectFreeze(this);
                        this.revoke();
                        return;
                    }
                }
                if (
                    this.foreignTargetTraits & TargetTraits.IsObject &&
                    !ReflectHas(shadowTarget, TO_STRING_TAG_SYMBOL)
                ) {
                    let toStringTag = 'Object';
                    try {
                        toStringTag = foreignCallableGetToStringTagOfTarget(foreignTargetPointer);
                        // eslint-disable-next-line no-empty
                    } catch {}
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
                } else if (LOCKER_UNMINIFIED_FLAG) {
                    // We don't wrap `foreignCallableDebugInfo()` in a try-catch
                    // because it cannot throw.
                    foreignCallableDebugInfo(
                        'Mutations on the membrane of an object originating ' +
                            'outside of the sandbox will not be reflected on ' +
                            'the object itself:',
                        foreignTargetPointer
                    );
                }
                // Future optimization: Hoping proxies with frozen handlers can
                // be faster.
                ObjectFreeze(this);
            }

            private makeProxyUnambiguous() {
                // We don't wrap `foreignCallableIsTargetLive()` in a try-catch
                // because it cannot throw.
                if (foreignCallableIsTargetLive(this.foreignTargetPointer)) {
                    this.makeProxyLive();
                } else {
                    this.makeProxyStatic();
                }
            }

            // Logic implementation of all traps.

            // Hybrid traps:
            // (traps that operate on their shadowTarget, proxy, and foreignTargetPointer):

            private static hybridGetTrap = IS_IN_SHADOW_REALM
                ? function (
                      this: BoundaryProxyHandler,
                      _shadowTarget: ShadowTarget,
                      key: PropertyKey,
                      receiver: any
                  ): ReturnType<typeof Reflect.get> {
                      let activity: any;
                      if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                          activity = startActivity('hybridGetTrap');
                      }
                      const { foreignTargetPointer, shadowTarget } = this;
                      const safeDesc = lookupForeignDescriptor(
                          foreignTargetPointer,
                          shadowTarget,
                          key
                      );
                      let result: any;
                      if (safeDesc) {
                          const { get: getter, value: localValue } = safeDesc;
                          if (getter) {
                              // Even though the getter function exists,
                              // we can't use `ReflectGet()` because there
                              // might be a distortion for that getter function,
                              // in which case we must resolve the local getter
                              // and call it instead.
                              result = ReflectApply(getter, receiver, []);
                          } else {
                              result = localValue;
                          }
                      } else if (
                          key === TO_STRING_TAG_SYMBOL &&
                          this.foreignTargetTraits & TargetTraits.IsObject
                      ) {
                          let toStringTag;
                          try {
                              toStringTag =
                                  foreignCallableGetToStringTagOfTarget(foreignTargetPointer);
                          } catch (error: any) {
                              const errorToThrow = selectedTarget ?? error;
                              selectedTarget = undefined;
                              if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                                  activity.error(errorToThrow);
                              }
                              throw errorToThrow;
                          }
                          // The default language toStringTag is "Object". If receive
                          // "Object" we return `undefined` to let the language resolve
                          // it naturally without projecting a value.
                          if (toStringTag !== 'Object') {
                              result = toStringTag;
                          }
                      }
                      if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                          activity.stop();
                      }
                      return result;
                  }
                : (noop as typeof Reflect.get);

            private static hybridHasTrap = IS_IN_SHADOW_REALM
                ? function (
                      this: BoundaryProxyHandler,
                      _shadowTarget: ShadowTarget,
                      key: PropertyKey
                  ): ReturnType<typeof Reflect.has> {
                      let activity: any;
                      if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                          activity = startActivity('hybridHasTrap');
                      }
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
                          if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                              activity.error(errorToThrow);
                          }
                          throw errorToThrow;
                      }
                      let result = false;
                      if (trueOrProtoPointerOrNull === true) {
                          result = true;
                      } else {
                          // Avoiding calling the has trap for any proto chain operation,
                          // instead we implement the regular logic here in this trap.
                          let currentObject: any;
                          if (typeof trueOrProtoPointerOrNull === 'function') {
                              trueOrProtoPointerOrNull();
                              currentObject = selectedTarget;
                              selectedTarget = undefined;
                          } else {
                              currentObject = trueOrProtoPointerOrNull;
                          }
                          while (currentObject) {
                              if (ReflectApply(ObjectProtoHasOwnProperty, currentObject, [key])) {
                                  result = true;
                                  break;
                              }
                              currentObject = ReflectGetPrototypeOf(currentObject);
                          }
                      }
                      if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                          activity.stop();
                      }
                      return result;
                  }
                : (alwaysFalse as typeof Reflect.has);

            // Passthru traps:

            private static passthruDefinePropertyTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                key: PropertyKey,
                unsafePartialDesc: PropertyDescriptor
            ): ReturnType<typeof Reflect.defineProperty> {
                lastProxyTrapCalled = ProxyHandlerTraps.DefineProperty;
                let activity: any;
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity = startActivity('[Native Reflect.defineProperty]');
                }
                const safePartialDesc = unsafePartialDesc;
                ReflectSetPrototypeOf(safePartialDesc, null);
                const { value, get: getter, set: setter } = safePartialDesc;
                const valuePointer =
                    'value' in safePartialDesc
                        ? // Inline getTransferableValue().
                          (typeof value === 'object' && value !== null) ||
                          typeof value === 'function'
                            ? getTransferablePointer(value)
                            : // Intentionally ignoring `document.all`.
                            // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                            // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                            typeof value === 'undefined'
                            ? undefined
                            : value
                        : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                const getPointer =
                    'get' in safePartialDesc
                        ? // Inline getTransferableValue().
                          (typeof getter === 'object' && getter !== null) ||
                          typeof getter === 'function'
                            ? getTransferablePointer(getter)
                            : getter
                        : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                const setPointer =
                    'set' in safePartialDesc
                        ? // Inline getTransferableValue().
                          (typeof setter === 'object' && setter !== null) ||
                          typeof setter === 'function'
                            ? getTransferablePointer(setter)
                            : setter
                        : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                let result = false;
                try {
                    result = foreignCallableDefineProperty(
                        this.foreignTargetPointer,
                        key,
                        'configurable' in safePartialDesc
                            ? !!safePartialDesc.configurable
                            : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL,
                        'enumerable' in safePartialDesc
                            ? !!safePartialDesc.enumerable
                            : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL,
                        'writable' in safePartialDesc
                            ? !!safePartialDesc.writable
                            : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL,
                        valuePointer,
                        getPointer,
                        setPointer,
                        this.nonConfigurableDescriptorCallback
                    );
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                        activity.error(errorToThrow);
                    }
                    throw errorToThrow;
                }
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity.stop();
                }
                return result;
            }

            private static passthruDeletePropertyTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                key: PropertyKey
            ): ReturnType<typeof Reflect.deleteProperty> {
                lastProxyTrapCalled = ProxyHandlerTraps.DeleteProperty;
                let activity: any;
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity = startActivity('[Native Reflect.deleteProperty]');
                }
                let result = false;
                try {
                    result = foreignCallableDeleteProperty(this.foreignTargetPointer, key);
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                        activity.error(errorToThrow);
                    }
                    throw errorToThrow;
                }
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity.stop();
                }
                return result;
            }

            private static passthruGetTrap = !IS_IN_SHADOW_REALM
                ? function (
                      this: BoundaryProxyHandler,
                      _shadowTarget: ShadowTarget,
                      key: PropertyKey,
                      receiver: any
                  ): ReturnType<typeof Reflect.get> {
                      // Only allow accessing near-membrane symbol values if the
                      // BoundaryProxyHandler.has trap has been called immediately
                      // before and the symbol does not exist.
                      nearMembraneSymbolFlag &&= lastProxyTrapCalled === ProxyHandlerTraps.Has;
                      lastProxyTrapCalled = ProxyHandlerTraps.Get;
                      if (nearMembraneSymbolFlag) {
                          // Exit without performing a [[Get]] for near-membrane
                          // symbols because we know when the nearMembraneSymbolFlag
                          // is on that there is no shadowed symbol value.
                          if (key === LOCKER_NEAR_MEMBRANE_SYMBOL) {
                              return true;
                          }
                          if (key === LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL) {
                              return this.serializedValue;
                          }
                      }
                      let activity: any;
                      if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                          activity = startActivity('[Native Reflect.get]');
                      }
                      // Inline getTransferableValue().
                      const transferableReceiver =
                          (typeof receiver === 'object' && receiver !== null) ||
                          typeof receiver === 'function'
                              ? getTransferablePointer(receiver)
                              : receiver;
                      let result: any;
                      try {
                          const pointerOrPrimitive = foreignCallableGet(
                              this.foreignTargetPointer,
                              this.foreignTargetTraits,
                              key,
                              transferableReceiver
                          );
                          if (typeof pointerOrPrimitive === 'function') {
                              pointerOrPrimitive();
                              result = selectedTarget;
                              selectedTarget = undefined;
                          } else {
                              result = pointerOrPrimitive;
                          }
                      } catch (error: any) {
                          const errorToThrow = selectedTarget ?? error;
                          selectedTarget = undefined;
                          if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                              activity.error(errorToThrow);
                          }
                          throw errorToThrow;
                      }
                      if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                          activity.stop();
                      }
                      return result;
                  }
                : (noop as typeof Reflect.get);

            private static passthruGetPrototypeOfTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget
            ): ReturnType<typeof Reflect.getPrototypeOf> {
                lastProxyTrapCalled = ProxyHandlerTraps.GetPrototypeOf;
                let activity: any;
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity = startActivity('[Native Reflect.getPrototypeOf]');
                }
                let protoPointerOrNull;
                try {
                    protoPointerOrNull = foreignCallableGetPrototypeOf(this.foreignTargetPointer);
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                        activity.error(errorToThrow);
                    }
                    throw errorToThrow;
                }
                let proto: any;
                if (typeof protoPointerOrNull === 'function') {
                    protoPointerOrNull();
                    proto = selectedTarget;
                    selectedTarget = undefined;
                } else {
                    proto = null;
                }
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity.stop();
                }
                return proto as object | null;
            }

            private static passthruHasTrap = !IS_IN_SHADOW_REALM
                ? function (
                      this: BoundaryProxyHandler,
                      _shadowTarget: ShadowTarget,
                      key: PropertyKey
                  ): ReturnType<typeof Reflect.has> {
                      lastProxyTrapCalled = ProxyHandlerTraps.Has;
                      let activity: any;
                      if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                          activity = startActivity('[Native Reflect.has]');
                      }
                      let result;
                      try {
                          result = foreignCallableHas(this.foreignTargetPointer, key);
                      } catch (error: any) {
                          const errorToThrow = selectedTarget ?? error;
                          selectedTarget = undefined;
                          if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                              activity.error(errorToThrow);
                          }
                          throw errorToThrow;
                      }
                      // The near-membrane symbol flag is on if the symbol does not
                      // exist on the object or its [[Prototype]].
                      nearMembraneSymbolFlag =
                          !result &&
                          (key === LOCKER_NEAR_MEMBRANE_SYMBOL ||
                              key === LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL);
                      if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                          activity.stop();
                      }
                      return result;
                  }
                : (alwaysFalse as typeof Reflect.has);

            private static passthruIsExtensibleTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget
            ): ReturnType<typeof Reflect.isExtensible> {
                lastProxyTrapCalled = ProxyHandlerTraps.IsExtensible;
                let activity: any;
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity = startActivity('[Native Reflect.isExtensible]');
                }
                const { shadowTarget } = this;
                let result = false;
                // Check if already locked.
                if (ReflectIsExtensible(shadowTarget)) {
                    const { foreignTargetPointer } = this;
                    try {
                        if (foreignCallableIsExtensible(foreignTargetPointer)) {
                            result = true;
                        }
                    } catch (error: any) {
                        const errorToThrow = selectedTarget ?? error;
                        selectedTarget = undefined;
                        if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                            activity.error(errorToThrow);
                        }
                        throw errorToThrow;
                    }
                    if (!result) {
                        lockShadowTarget(shadowTarget, foreignTargetPointer);
                    }
                }
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity.stop();
                }
                return result;
            }

            private static passthruOwnKeysTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget
            ): ReturnType<typeof Reflect.ownKeys> {
                lastProxyTrapCalled = ProxyHandlerTraps.OwnKeys;
                let activity: any;
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity = startActivity('[Native Reflect.ownKeys]');
                }
                let ownKeys: ReturnType<typeof Reflect.ownKeys> | undefined;
                try {
                    foreignCallableOwnKeys(this.foreignTargetPointer, (...args) => {
                        ownKeys = args;
                    });
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                        activity.error(errorToThrow);
                    }
                    throw errorToThrow;
                }
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity.stop();
                }
                return ownKeys || [];
            }

            private static passthruGetOwnPropertyDescriptorTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                key: PropertyKey
            ): ReturnType<typeof Reflect.getOwnPropertyDescriptor> {
                lastProxyTrapCalled = ProxyHandlerTraps.GetOwnPropertyDescriptor;
                let activity: any;
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity = startActivity('[Native Reflect.getOwnPropertyDescriptor]');
                }
                let safeDesc: PropertyDescriptor | undefined;
                try {
                    foreignCallableGetOwnPropertyDescriptor(
                        this.foreignTargetPointer,
                        key,
                        (
                            _key,
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
                                ReflectDefineProperty(this.shadowTarget, key, safeDesc);
                            }
                        }
                    );
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                        activity.error(errorToThrow);
                    }
                    throw errorToThrow;
                }
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity.stop();
                }
                return safeDesc;
            }

            private static passthruPreventExtensionsTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget
            ): ReturnType<typeof Reflect.preventExtensions> {
                lastProxyTrapCalled = ProxyHandlerTraps.PreventExtensions;
                let activity: any;
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity = startActivity('[Native Reflect.preventExtensions]');
                }
                const { shadowTarget } = this;
                let result = true;
                if (ReflectIsExtensible(shadowTarget)) {
                    const { foreignTargetPointer } = this;
                    let resultEnum: PreventExtensionsResult;
                    try {
                        resultEnum = foreignCallablePreventExtensions(foreignTargetPointer);
                    } catch (error: any) {
                        const errorToThrow = selectedTarget ?? error;
                        selectedTarget = undefined;
                        if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                            activity.error(errorToThrow);
                        }
                        throw errorToThrow;
                    }
                    if (resultEnum & PreventExtensionsResult.False) {
                        if (!(resultEnum & PreventExtensionsResult.Extensible)) {
                            // If the target is a proxy manually created, it might
                            // reject the preventExtension call, in which case we
                            // should not attempt to lock down the shadow target.
                            lockShadowTarget(shadowTarget, foreignTargetPointer);
                        }
                        result = false;
                    } else {
                        lockShadowTarget(shadowTarget, foreignTargetPointer);
                    }
                }
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity.stop();
                }
                return result;
            }

            private static passthruSetPrototypeOfTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                proto: object | null
            ): ReturnType<typeof Reflect.setPrototypeOf> {
                lastProxyTrapCalled = ProxyHandlerTraps.SetPrototypeOf;
                let activity: any;
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity = startActivity('[Native Reflect.setPrototypeOf]');
                }
                const transferableProto = proto ? getTransferablePointer(proto) : proto;
                let result = false;
                try {
                    result = foreignCallableSetPrototypeOf(
                        this.foreignTargetPointer,
                        transferableProto
                    );
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                        activity.error(errorToThrow);
                    }
                    throw errorToThrow;
                }
                if (LOCKER_DEBUG_MODE_INSTRUMENTATION_FLAG) {
                    activity.stop();
                }
                return result;
            }

            private static passthruSetTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                key: PropertyKey,
                value: any,
                receiver: any
            ): boolean {
                lastProxyTrapCalled = ProxyHandlerTraps.Set;
                const { foreignTargetPointer, proxy } = this;
                // Intentionally ignoring `document.all`.
                // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                if (typeof value === 'undefined') {
                    value = undefined;
                }
                if (typeof receiver === 'undefined') {
                    receiver = proxy;
                }
                return proxy === receiver
                    ? // Fast path.
                      passthruForeignCallableSet(foreignTargetPointer, key, value, receiver)
                    : passthruForeignTraversedSet(
                          foreignTargetPointer,
                          this.shadowTarget,
                          key,
                          value,
                          receiver
                      );
            }

            // Pending traps:

            private static pendingDefinePropertyTrap = IS_IN_SHADOW_REALM
                ? function (
                      this: BoundaryProxyHandler,
                      shadowTarget: ShadowTarget,
                      key: PropertyKey,
                      unsafePartialDesc: PropertyDescriptor
                  ): ReturnType<typeof Reflect.defineProperty> {
                      this.makeProxyUnambiguous();
                      return this.defineProperty!(shadowTarget, key, unsafePartialDesc);
                  }
                : (alwaysFalse as typeof Reflect.defineProperty);

            private static pendingDeletePropertyTrap = IS_IN_SHADOW_REALM
                ? function (
                      this: BoundaryProxyHandler,
                      shadowTarget: ShadowTarget,
                      key: PropertyKey
                  ): ReturnType<typeof Reflect.deleteProperty> {
                      this.makeProxyUnambiguous();
                      return this.deleteProperty!(shadowTarget, key);
                  }
                : (alwaysFalse as typeof Reflect.deleteProperty);

            private static pendingPreventExtensionsTrap = IS_IN_SHADOW_REALM
                ? function (
                      this: BoundaryProxyHandler,
                      shadowTarget: ShadowTarget
                  ): ReturnType<typeof Reflect.preventExtensions> {
                      this.makeProxyUnambiguous();
                      return this.preventExtensions!(shadowTarget);
                  }
                : (alwaysFalse as typeof Reflect.preventExtensions);

            private static pendingSetPrototypeOfTrap = IS_IN_SHADOW_REALM
                ? function (
                      this: BoundaryProxyHandler,
                      shadowTarget: ShadowTarget,
                      proto: object | null
                  ): ReturnType<typeof Reflect.setPrototypeOf> {
                      this.makeProxyUnambiguous();
                      return this.setPrototypeOf!(shadowTarget, proto);
                  }
                : (alwaysFalse as typeof Reflect.setPrototypeOf);

            private static pendingSetTrap = IS_IN_SHADOW_REALM
                ? function (
                      this: BoundaryProxyHandler,
                      shadowTarget: ShadowTarget,
                      key: PropertyKey,
                      value: any,
                      receiver: any
                  ): ReturnType<typeof Reflect.set> {
                      this.makeProxyUnambiguous();
                      return this.set!(shadowTarget, key, value, receiver);
                  }
                : (alwaysFalse as typeof Reflect.set);

            //  Static traps:

            private static staticDefinePropertyTrap = IS_IN_SHADOW_REALM
                ? ReflectDefineProperty
                : (alwaysFalse as typeof Reflect.defineProperty);

            private static staticDeletePropertyTrap = IS_IN_SHADOW_REALM
                ? ReflectDeleteProperty
                : (alwaysFalse as typeof Reflect.deleteProperty);

            private static staticGetOwnPropertyDescriptorTrap = IS_IN_SHADOW_REALM
                ? ReflectGetOwnPropertyDescriptor
                : (noop as typeof Reflect.getOwnPropertyDescriptor);

            private static staticGetPrototypeOfTrap = IS_IN_SHADOW_REALM
                ? ReflectGetPrototypeOf
                : ((() => null) as typeof Reflect.getPrototypeOf);

            private static staticGetTrap = IS_IN_SHADOW_REALM
                ? function (
                      this: BoundaryProxyHandler,
                      shadowTarget: ShadowTarget,
                      key: PropertyKey,
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
                : (noop as typeof Reflect.get);

            private static staticHasTrap = IS_IN_SHADOW_REALM
                ? ReflectHas
                : (alwaysFalse as typeof Reflect.has);

            private static staticIsExtensibleTrap = IS_IN_SHADOW_REALM
                ? ReflectIsExtensible
                : (alwaysFalse as typeof Reflect.isExtensible);

            private static staticOwnKeysTrap = IS_IN_SHADOW_REALM
                ? ReflectOwnKeys
                : ((() => []) as typeof Reflect.ownKeys);

            private static staticPreventExtensionsTrap = IS_IN_SHADOW_REALM
                ? ReflectPreventExtensions
                : (alwaysFalse as typeof Reflect.preventExtensions);

            private static staticSetPrototypeOfTrap = IS_IN_SHADOW_REALM
                ? ReflectSetPrototypeOf
                : (alwaysFalse as typeof Reflect.setPrototypeOf);

            private static staticSetTrap = IS_IN_SHADOW_REALM
                ? ReflectSet
                : (alwaysFalse as typeof Reflect.set);

            // Default traps:

            // Pending traps are needed for the shadow realm side of the membrane
            // to avoid leaking mutation operations on the primary realm side.
            private static defaultDefinePropertyTrap = IS_IN_SHADOW_REALM
                ? BoundaryProxyHandler.pendingDefinePropertyTrap
                : BoundaryProxyHandler.passthruDefinePropertyTrap;

            private static defaultDeletePropertyTrap = IS_IN_SHADOW_REALM
                ? BoundaryProxyHandler.pendingDeletePropertyTrap
                : BoundaryProxyHandler.passthruDeletePropertyTrap;

            private static defaultGetOwnPropertyDescriptorTrap =
                BoundaryProxyHandler.passthruGetOwnPropertyDescriptorTrap;

            private static defaultGetPrototypeOfTrap =
                BoundaryProxyHandler.passthruGetPrototypeOfTrap;

            private static defaultGetTrap = IS_IN_SHADOW_REALM
                ? BoundaryProxyHandler.hybridGetTrap
                : BoundaryProxyHandler.passthruGetTrap;

            private static defaultHasTrap = IS_IN_SHADOW_REALM
                ? BoundaryProxyHandler.hybridHasTrap
                : BoundaryProxyHandler.passthruHasTrap;

            private static defaultIsExtensibleTrap = BoundaryProxyHandler.passthruIsExtensibleTrap;

            private static defaultOwnKeysTrap = BoundaryProxyHandler.passthruOwnKeysTrap;

            private static defaultPreventExtensionsTrap = IS_IN_SHADOW_REALM
                ? BoundaryProxyHandler.pendingPreventExtensionsTrap
                : BoundaryProxyHandler.passthruPreventExtensionsTrap;

            private static defaultSetTrap = IS_IN_SHADOW_REALM
                ? BoundaryProxyHandler.pendingSetTrap
                : BoundaryProxyHandler.passthruSetTrap;

            private static defaultSetPrototypeOfTrap = IS_IN_SHADOW_REALM
                ? BoundaryProxyHandler.pendingSetPrototypeOfTrap
                : BoundaryProxyHandler.passthruSetPrototypeOfTrap;
        }
        // Export callable hooks to a foreign realm.
        foreignCallableHooksCallback(
            // globalThisPointer
            // When crossing, should be mapped to the foreign globalThis
            createPointer(globalThisRef),
            // getSelectedTarget
            !IS_IN_SHADOW_REALM
                ? (): any => {
                      const result = selectedTarget;
                      selectedTarget = undefined;
                      return result;
                  }
                : (noop as GetSelectedTarget),
            // getTransferableValue
            (value: any): PointerOrPrimitive => {
                if ((typeof value === 'object' && value !== null) || typeof value === 'function') {
                    return getTransferablePointer(value);
                }
                // Intentionally ignoring `document.all`.
                // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                return typeof value === 'undefined' ? undefined : value;
            },
            // callableGetPropertyValuePointer: this callable function allows
            // the foreign realm to access a linkable pointer for a property value.
            // In order to do that, the foreign side must provide a pointer and
            // a key access the value in order to produce a pointer
            (targetPointer: Pointer, key: PropertyKey) => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                const value = target?.[key];
                // Intentionally ignoring `document.all`.
                // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                return createPointer(typeof value === 'undefined' ? undefined : value);
            },
            // callableEvaluate
            IS_IN_SHADOW_REALM
                ? (sourceText: string): PointerOrPrimitive => {
                      try {
                          const result = localEval!(sourceText);
                          // Inline getTransferableValue().
                          return (typeof result === 'object' && result !== null) ||
                              typeof result === 'function'
                              ? getTransferablePointer(result)
                              : result;
                      } catch (error: any) {
                          throw pushErrorAcrossBoundary(error);
                      }
                  }
                : (noop as CallableEvaluate),
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
            // callablePushErrorTarget
            LOCKER_DEBUGGABLE_FLAG
                ? (
                      foreignTargetPointer: () => void,
                      foreignTargetTraits: TargetTraits,
                      foreignTargetFunctionArity: number | undefined,
                      foreignTargetFunctionName: string | undefined
                  ): Pointer => {
                      const pointer = pushTarget(
                          foreignTargetPointer,
                          foreignTargetTraits,
                          foreignTargetFunctionArity,
                          foreignTargetFunctionName
                      );
                      const pointerWrapper = () => {
                          checkDebugMode();
                          return pointer();
                      };
                      if (DEV_MODE) {
                          pointerWrapper['[[OriginalTarget]]'] = pointer['[[OriginalTarget]]'];
                          pointerWrapper['[[Color]]'] = pointer['[[Color]]'];
                      }
                      return pointerWrapper;
                  }
                : pushTarget,
            // callablePushTarget: This function can be used by a foreign realm
            // to install a proxy into this realm that correspond to an object
            // from the foreign realm. It returns a Pointer that can be used by
            // the foreign realm to pass back a reference to this realm when
            // passing arguments or returning from a foreign callable invocation.
            // This function is extremely important to understand the mechanics
            // of this membrane.
            pushTarget,
            // callableApply
            (
                targetPointer: Pointer,
                thisArgPointerOrUndefined: PointerOrPrimitive,
                ...args: PointerOrPrimitive[]
            ): PointerOrPrimitive => {
                targetPointer();
                const func = selectedTarget as Function;
                selectedTarget = undefined;
                let thisArg: ProxyTarget | undefined;
                if (typeof thisArgPointerOrUndefined === 'function') {
                    thisArgPointerOrUndefined();
                    thisArg = selectedTarget;
                    selectedTarget = undefined;
                }
                for (let i = 0, { length } = args; i < length; i += 1) {
                    const pointerOrPrimitive = args[i];
                    if (typeof pointerOrPrimitive === 'function') {
                        pointerOrPrimitive();
                        args[i] = selectedTarget;
                        selectedTarget = undefined;
                    }
                }
                let result;
                try {
                    result = ReflectApply(func, thisArg, args);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
                // Inline getTransferableValue().
                return (typeof result === 'object' && result !== null) ||
                    typeof result === 'function'
                    ? getTransferablePointer(result)
                    : // Intentionally ignoring `document.all`.
                    // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                    // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                    typeof result === 'undefined'
                    ? undefined
                    : result;
            },
            // callableConstruct
            (
                targetPointer: Pointer,
                newTargetPointerOrUndefined: PointerOrPrimitive,
                ...args: PointerOrPrimitive[]
            ): PointerOrPrimitive => {
                targetPointer();
                const constructor = selectedTarget as Function;
                selectedTarget = undefined;
                let newTarget: Function | undefined;
                if (typeof newTargetPointerOrUndefined === 'function') {
                    newTargetPointerOrUndefined();
                    newTarget = selectedTarget as Function | undefined;
                    selectedTarget = undefined;
                }
                for (let i = 0, { length } = args; i < length; i += 1) {
                    const pointerOrPrimitive = args[i];
                    if (typeof pointerOrPrimitive === 'function') {
                        pointerOrPrimitive();
                        args[i] = selectedTarget;
                        selectedTarget = undefined;
                    }
                }
                let result;
                try {
                    result = ReflectConstruct(constructor, args, newTarget);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
                // Inline getTransferableValue().
                return (typeof result === 'object' && result !== null) ||
                    typeof result === 'function'
                    ? getTransferablePointer(result)
                    : // Intentionally ignoring `document.all`.
                    // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                    // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                    typeof result === 'undefined'
                    ? undefined
                    : result;
            },
            // callableDefineProperty
            (
                targetPointer: Pointer,
                key: PropertyKey,
                configurable: boolean | symbol,
                enumerable: boolean | symbol,
                writable: boolean | symbol,
                valuePointer: PointerOrPrimitive,
                getPointer: PointerOrPrimitive,
                setPointer: PointerOrPrimitive,
                foreignCallableNonConfigurableDescriptorCallback: CallableDescriptorCallback
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
                if (result && configurable === false) {
                    let safeDesc;
                    try {
                        safeDesc = ReflectGetOwnPropertyDescriptor(target, key);
                    } catch (error: any) {
                        throw pushErrorAcrossBoundary(error);
                    }
                    if (safeDesc) {
                        ReflectSetPrototypeOf(safeDesc, null);
                        if (safeDesc.configurable === false) {
                            const { value, get: getter, set: setter } = safeDesc;
                            foreignCallableNonConfigurableDescriptorCallback(
                                key,
                                false, // configurable
                                'enumerable' in safeDesc
                                    ? (safeDesc.enumerable as boolean)
                                    : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL,
                                'writable' in safeDesc
                                    ? (safeDesc.writable as boolean)
                                    : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL,
                                'value' in safeDesc
                                    ? // Inline getTransferableValue().
                                      (typeof value === 'object' && value !== null) ||
                                      typeof value === 'function'
                                        ? getTransferablePointer(value)
                                        : value
                                    : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL,
                                'get' in safeDesc
                                    ? // Inline getTransferableValue().
                                      (typeof getter === 'object' && getter !== null) ||
                                      typeof getter === 'function'
                                        ? getTransferablePointer(getter)
                                        : getter
                                    : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL,
                                'set' in safeDesc
                                    ? // Inline getTransferableValue().
                                      (typeof setter === 'object' && setter !== null) ||
                                      typeof setter === 'function'
                                        ? getTransferablePointer(setter)
                                        : setter
                                    : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL
                            );
                        }
                    }
                }
                return result;
            },
            // callableDeleteProperty
            (targetPointer: Pointer, key: PropertyKey): boolean => {
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
                key: PropertyKey,
                receiverPointerOrPrimitive: PointerOrPrimitive
            ): PointerOrPrimitive => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                let receiver: any;
                if (typeof receiverPointerOrPrimitive === 'function') {
                    receiverPointerOrPrimitive();
                    receiver = selectedTarget;
                    selectedTarget = undefined;
                } else {
                    receiver = receiverPointerOrPrimitive;
                }
                let result;
                try {
                    result = ReflectGet(target, key, receiver);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
                // Inline getTransferableValue().
                if (
                    (typeof result === 'object' && result !== null) ||
                    typeof result === 'function'
                ) {
                    return getTransferablePointer(result);
                }
                if (
                    result === undefined &&
                    key === TO_STRING_TAG_SYMBOL &&
                    targetTraits & TargetTraits.IsObject
                ) {
                    try {
                        if (!ReflectHas(target, key)) {
                            // Section 19.1.3.6 Object.prototype.toString()
                            // https://tc39.github.io/ecma262/#sec-object.prototype.tostring
                            const brand = ReflectApply(ObjectProtoToString, target, []) as string;
                            // The default language toStringTag is "Object".
                            // If receive "[object Object]" we return `undefined`
                            // to let the language resolve it naturally without
                            // projecting a value.
                            if (brand !== '[object Object]') {
                                result = ReflectApply(StringProtoSlice, brand, [8, -1]);
                            }
                        }
                    } catch (error: any) {
                        throw pushErrorAcrossBoundary(error);
                    }
                }
                // Intentionally ignoring `document.all`.
                // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                return typeof result === 'undefined' ? undefined : result;
            },
            // callableGetOwnPropertyDescriptor
            (
                targetPointer: Pointer,
                key: PropertyKey,
                foreignCallableDescriptorCallback: CallableDescriptorCallback
            ): void => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                let safeDesc;
                try {
                    safeDesc = ReflectGetOwnPropertyDescriptor(target, key);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
                if (safeDesc) {
                    ReflectSetPrototypeOf(safeDesc, null);
                    const { value, get: getter, set: setter } = safeDesc;
                    foreignCallableDescriptorCallback(
                        key,
                        'configurable' in safeDesc
                            ? (safeDesc.configurable as boolean)
                            : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL,
                        'enumerable' in safeDesc
                            ? (safeDesc.enumerable as boolean)
                            : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL,
                        'writable' in safeDesc
                            ? (safeDesc.writable as boolean)
                            : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL,
                        'value' in safeDesc
                            ? // Inline getTransferableValue().
                              (typeof value === 'object' && value !== null) ||
                              typeof value === 'function'
                                ? getTransferablePointer(value)
                                : // Intentionally ignoring `document.all`.
                                // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                                // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                                typeof value === 'undefined'
                                ? undefined
                                : value
                            : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL,
                        'get' in safeDesc
                            ? // Inline getTransferableValue().
                              (typeof getter === 'object' && getter !== null) ||
                              typeof getter === 'function'
                                ? getTransferablePointer(getter)
                                : getter
                            : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL,
                        'set' in safeDesc
                            ? // Inline getTransferableValue().
                              (typeof setter === 'object' && setter !== null) ||
                              typeof setter === 'function'
                                ? getTransferablePointer(setter)
                                : setter
                            : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL
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
                // Intentionally ignoring `document.all`.
                // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                if (typeof proto === 'undefined') {
                    return null;
                }
                return proto ? getTransferablePointer(proto) : proto;
            },
            // callableHas
            (targetPointer: Pointer, key: PropertyKey): boolean => {
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
                    ownKeys = ReflectOwnKeys(target);
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
                    if (result & PreventExtensionsResult.False && ReflectIsExtensible(target)) {
                        result |= PreventExtensionsResult.Extensible;
                    }
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
                return result;
            },
            // callableSet
            (
                targetPointer: Pointer,
                key: PropertyKey,
                valuePointerOrPrimitive: PointerOrPrimitive,
                receiverPointerOrPrimitive: PointerOrPrimitive
            ): boolean => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                let value: any;
                if (typeof valuePointerOrPrimitive === 'function') {
                    valuePointerOrPrimitive();
                    value = selectedTarget;
                    selectedTarget = undefined;
                } else {
                    value = valuePointerOrPrimitive;
                }
                let receiver: any;
                if (typeof receiverPointerOrPrimitive === 'function') {
                    receiverPointerOrPrimitive();
                    receiver = selectedTarget;
                    selectedTarget = undefined;
                } else {
                    receiver = receiverPointerOrPrimitive;
                }
                try {
                    return ReflectSet(target, key, value, receiver);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
            },
            // callableSetPrototypeOf
            (targetPointer: Pointer, protoPointerOrNull: Pointer | null = null): boolean => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                let proto: any;
                if (typeof protoPointerOrNull === 'function') {
                    protoPointerOrNull();
                    proto = selectedTarget;
                    selectedTarget = undefined;
                } else {
                    proto = null;
                }
                try {
                    return ReflectSetPrototypeOf(target, proto);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
            },
            // callableDebugInfo
            LOCKER_DEBUGGABLE_FLAG
                ? (...args: Parameters<typeof console.info>) => {
                      if (checkDebugMode()) {
                          for (let i = 0, { length } = args; i < length; i += 1) {
                              const pointerOrPrimitive: PointerOrPrimitive = args[i];
                              if (typeof pointerOrPrimitive === 'function') {
                                  pointerOrPrimitive();
                                  args[i] = selectedTarget;
                                  selectedTarget = undefined;
                              }
                          }
                          try {
                              ReflectApply(consoleInfo!, consoleObject, args);
                              // eslint-disable-next-line no-empty
                          } catch {}
                      }
                  }
                : (noop as CallableDebugInfo),
            // callableDefineProperties
            IS_IN_SHADOW_REALM
                ? (
                      targetPointer: Pointer,
                      ...descriptorTuples: [...Parameters<CallableDescriptorCallback>]
                  ): void => {
                      targetPointer();
                      const target = selectedTarget!;
                      selectedTarget = undefined;
                      for (let i = 0, { length } = descriptorTuples; i < length; i += 7) {
                          // We don't use `ObjectDefineProperties()` here because it
                          // will throw an exception if it fails to define one of its
                          // properties.
                          ReflectDefineProperty(
                              target,
                              descriptorTuples[i] as PropertyKey,
                              createDescriptorFromMeta(
                                  descriptorTuples[i + 1] as boolean | symbol, // configurable
                                  descriptorTuples[i + 2] as boolean | symbol, // enumerable
                                  descriptorTuples[i + 3] as boolean | symbol, // writable
                                  descriptorTuples[i + 4] as PointerOrPrimitive, // valuePointer
                                  descriptorTuples[i + 5] as PointerOrPrimitive, // getPointer
                                  descriptorTuples[i + 6] as PointerOrPrimitive // setPointer
                              )
                          );
                      }
                  }
                : (noop as CallableDefineProperties),
            // callableGetLazyPropertyDescriptorStateByTarget
            !IS_IN_SHADOW_REALM
                ? (targetPointer: Pointer) => {
                      targetPointer();
                      const target = selectedTarget!;
                      selectedTarget = undefined;
                      // We don't wrap the `WeakMapProtoGet` call in a try-catch
                      // because we know `target` is an object.
                      const state = ReflectApply(
                          WeakMapProtoGet,
                          proxyTargetToLazyPropertyDescriptorStateByTargetMap,
                          [target]
                      );
                      return state ? getTransferablePointer(state) : state;
                  }
                : (noop as CallableGetLazyPropertyDescriptorStateByTarget),
            // callableGetTargetIntegrityTraits
            !IS_IN_SHADOW_REALM
                ? (targetPointer: Pointer): TargetIntegrityTraits => {
                      targetPointer();
                      const target = selectedTarget!;
                      selectedTarget = undefined;
                      // A target may be a proxy that is revoked or throws in its
                      // "isExtensible" trap.
                      try {
                          if (!ReflectIsExtensible(target)) {
                              if (ObjectIsFrozen(target)) {
                                  return (
                                      TargetIntegrityTraits.IsFrozen &
                                      TargetIntegrityTraits.IsSealed &
                                      TargetIntegrityTraits.IsNotExtensible
                                  );
                              }
                              if (ObjectIsSealed(target)) {
                                  return (
                                      TargetIntegrityTraits.IsSealed &
                                      TargetIntegrityTraits.IsNotExtensible
                                  );
                              }
                              return TargetIntegrityTraits.IsNotExtensible;
                          }
                      } catch {
                          try {
                              isArrayOrThrowForRevoked(target);
                          } catch {
                              return TargetIntegrityTraits.Revoked;
                          }
                      }
                      return TargetIntegrityTraits.None;
                  }
                : ((() => TargetIntegrityTraits.None) as CallableGetTargetIntegrityTraits),
            // callableGetToStringTagOfTarget
            (targetPointer: Pointer): string => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                try {
                    // Section 19.1.3.6 Object.prototype.toString()
                    // https://tc39.github.io/ecma262/#sec-object.prototype.tostring
                    const brand = ReflectApply(ObjectProtoToString, target, []);
                    return brand === '[object Object]'
                        ? 'Object'
                        : ReflectApply(StringProtoSlice, brand, [8, -1]);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
            },
            // callableInstallErrorPrepareStackTrace
            installErrorPrepareStackTrace,
            // callableInstallLazyPropertyDescriptors
            IS_IN_SHADOW_REALM
                ? (
                      targetPointer: Pointer,
                      ...ownKeysAndUnforgeableGlobalThisKeys: PropertyKeys
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
                          ownKeys = ReflectApply(
                              ArrayProtoSlice,
                              ownKeysAndUnforgeableGlobalThisKeys,
                              [0, sliceIndex]
                          );
                          unforgeableGlobalThisKeys = ReflectApply(
                              ArrayProtoSlice,
                              ownKeysAndUnforgeableGlobalThisKeys,
                              [sliceIndex + 1]
                          );
                      }
                      targetPointer();
                      const target = selectedTarget!;
                      selectedTarget = undefined;
                      let state = getLazyPropertyDescriptorStateByTarget(target);
                      if (state === undefined) {
                          state = { __proto__: null };
                          setLazyPropertyDescriptorStateByTarget(target, state);
                      }
                      for (let i = 0, { length } = ownKeys; i < length; i += 1) {
                          const ownKey = ownKeys[i];
                          state[ownKey] = true;
                          ReflectDefineProperty(
                              target,
                              ownKey,
                              // The role of this descriptor is to serve as a
                              // bouncer. When either a getter or a setter is
                              // invoked the descriptor will be replaced with
                              // the descriptor from the foreign side and the
                              // get/set operation will carry on from there.
                              {
                                  __proto__: null,
                                  // We DO explicitly set configurability in the
                                  // off chance that the property doesn't exist.
                                  configurable: true,
                                  // We DON'T explicitly set enumerability to
                                  // defer to the enumerability of the existing
                                  // property. In the off chance the property
                                  // doesn't exist the property will be defined
                                  // as non-enumerable.
                                  get(): any {
                                      activateLazyOwnPropertyDefinition(target, ownKey, state!);
                                      return ReflectGet(target, ownKey);
                                  },
                                  set(value: any) {
                                      activateLazyOwnPropertyDefinition(target, ownKey, state!);
                                      ReflectSet(target, ownKey, value);
                                  },
                              } as PropertyDescriptor
                          );
                      }
                      installPropertyDescriptorMethodWrappers(unforgeableGlobalThisKeys);
                  }
                : (noop as CallableInstallLazyPropertyDescriptors),
            // callableIsTargetLive
            !IS_IN_SHADOW_REALM
                ? (targetPointer: Pointer): boolean => {
                      targetPointer();
                      const target = selectedTarget!;
                      selectedTarget = undefined;
                      if (target === ObjectProto) {
                          return false;
                      }
                      try {
                          if (typeof target === 'object') {
                              const { constructor } = target;
                              if (constructor === ObjectCtor) {
                                  // If the constructor, own or inherited, points to `Object`
                                  // then `value` is not likely a prototype object.
                                  return true;
                              }
                              if (ReflectGetPrototypeOf(target) === null) {
                                  // Ensure `value` is not an `Object.prototype` from an iframe.
                                  if (
                                      typeof constructor !== 'function' ||
                                      constructor.prototype !== target
                                  ) {
                                      return true;
                                  }
                              }
                              // We only check for typed arrays, array buffers, and regexp here
                              // since plain arrays are marked as live in the BoundaryProxyHandler
                              // constructor.
                              if (ArrayBufferIsView(target)) {
                                  return true;
                              }
                              try {
                                  // Section 25.1.5.1 get ArrayBuffer.prototype.byteLength
                                  // https://tc39.es/ecma262/#sec-get-arraybuffer.prototype.bytelength
                                  // Step 2: Perform ? RequireInternalSlot(O, [[ArrayBufferData]]).
                                  ReflectApply(ArrayBufferProtoByteLengthGetter!, target, []);
                                  return true;
                                  // eslint-disable-next-line no-empty
                              } catch {}
                              try {
                                  // Section 25.1.5.1 get ArrayBuffer.prototype.byteLength
                                  // https://tc39.es/ecma262/#sec-get-regexp.prototype.source
                                  // Step 3: If R does not have an [[OriginalSource]] internal slot, then
                                  //     a. If SameValue(R, %RegExp.prototype%) is true, return "(?:)".
                                  //     b. Otherwise, throw a TypeError exception.
                                  if (target !== RegExpProto) {
                                      ReflectApply(RegExpProtoSourceGetter, target, []);
                                      return true;
                                  }
                                  // eslint-disable-next-line no-empty
                              } catch {}
                          }
                          return ReflectApply(ObjectProtoHasOwnProperty, target, [
                              LOCKER_LIVE_VALUE_MARKER_SYMBOL,
                          ]);
                          // eslint-disable-next-line no-empty
                      } catch {}
                      return false;
                  }
                : (alwaysFalse as CallableIsTargetLive),
            // callableIsTargetRevoked
            !IS_IN_SHADOW_REALM
                ? (targetPointer: Pointer): boolean => {
                      targetPointer();
                      const target = selectedTarget!;
                      selectedTarget = undefined;
                      try {
                          isArrayOrThrowForRevoked(target);
                          return false;
                          //  eslint-disable-next-line no-empty
                      } catch {}
                      return true;
                  }
                : (alwaysFalse as CallableIsTargetRevoked),
            // callableSerializeTarget
            IS_IN_SHADOW_REALM
                ? (targetPointer: Pointer): SerializedValue | undefined => {
                      targetPointer();
                      const target = selectedTarget!;
                      selectedTarget = undefined;
                      try {
                          return ReflectHas(target, TO_STRING_TAG_SYMBOL)
                              ? serializeTargetByTrialAndError(target)
                              : // Fast path.
                                serializeTargetByBrand(target);
                          // eslint-disable-next-line no-empty
                      } catch {}
                      return undefined;
                  }
                : (noop as CallableSerializeTarget),
            // callableSetLazyPropertyDescriptorStateByTarget
            !IS_IN_SHADOW_REALM
                ? (targetPointer: Pointer, statePointer: Pointer) => {
                      targetPointer();
                      const target = selectedTarget!;
                      selectedTarget = undefined;
                      statePointer();
                      const state = selectedTarget!;
                      selectedTarget = undefined;
                      // We don't wrap the `WeakMapProtoSet` call in a try-catch
                      // because we know `target` is an object.
                      ReflectApply(
                          WeakMapProtoSet,
                          proxyTargetToLazyPropertyDescriptorStateByTargetMap,
                          [target, state]
                      );
                  }
                : (noop as CallableSetLazyPropertyDescriptorStateByTarget),
            // callableBatchGetPrototypeOfAndGetOwnPropertyDescriptors
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
                const descriptorTuples = new ArrayCtor(
                    length * 7
                ) as Parameters<CallableDescriptorCallback>;
                for (let i = 0, j = 0; i < length; i += 1, j += 7) {
                    const ownKey = ownKeys[i];
                    const safeDesc = (unsafeDescMap as any)[ownKey];
                    ReflectSetPrototypeOf(safeDesc, null);
                    const { value, get: getter, set: setter } = safeDesc;
                    descriptorTuples[j] = ownKey;
                    descriptorTuples[j + 1] =
                        'configurable' in safeDesc
                            ? (safeDesc.configurable as boolean)
                            : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                    descriptorTuples[j + 2] =
                        'enumerable' in safeDesc
                            ? (safeDesc.enumerable as boolean)
                            : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                    descriptorTuples[j + 3] =
                        'writable' in safeDesc
                            ? (safeDesc.writable as boolean)
                            : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                    descriptorTuples[j + 4] =
                        'value' in safeDesc
                            ? // Inline getTransferableValue().
                              (typeof value === 'object' && value !== null) ||
                              typeof value === 'function'
                                ? getTransferablePointer(value)
                                : value
                            : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                    descriptorTuples[j + 5] =
                        'get' in safeDesc
                            ? // Inline getTransferableValue().
                              (typeof getter === 'object' && getter !== null) ||
                              typeof getter === 'function'
                                ? getTransferablePointer(getter)
                                : getter
                            : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                    descriptorTuples[j + 6] =
                        'set' in safeDesc
                            ? // Inline getTransferableValue().
                              (typeof setter === 'object' && setter !== null) ||
                              typeof setter === 'function'
                                ? getTransferablePointer(setter)
                                : setter
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
                // Intentionally ignoring `document.all`.
                // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                if (typeof proto === 'undefined') {
                    return null;
                }
                return proto ? getTransferablePointer(proto) : proto;
            },
            // callableBatchGetPrototypeOfWhenHasNoOwnProperty
            (targetPointer: Pointer, key: PropertyKey): PointerOrPrimitive => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                let proto;
                try {
                    if (ReflectApply(ObjectProtoHasOwnProperty, target, [key])) {
                        return true;
                    }
                    proto = ReflectGetPrototypeOf(target);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
                // Intentionally ignoring `document.all`.
                // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                if (typeof proto === 'undefined') {
                    return null;
                }
                return proto ? getTransferablePointer(proto) : proto;
            },
            // callableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor
            (
                targetPointer: Pointer,
                key: PropertyKey,
                foreignCallableDescriptorCallback: CallableDescriptorCallback
            ): PointerOrPrimitive => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                let safeDesc;
                try {
                    safeDesc = ReflectGetOwnPropertyDescriptor(target, key);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
                if (safeDesc) {
                    ReflectSetPrototypeOf(safeDesc, null);
                    const { value, get: getter, set: setter } = safeDesc;
                    foreignCallableDescriptorCallback(
                        key,
                        'configurable' in safeDesc
                            ? (safeDesc.configurable as boolean)
                            : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL,
                        'enumerable' in safeDesc
                            ? (safeDesc.enumerable as boolean)
                            : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL,
                        'writable' in safeDesc
                            ? (safeDesc.writable as boolean)
                            : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL,
                        'value' in safeDesc
                            ? // Inline getTransferableValue().
                              (typeof value === 'object' && value !== null) ||
                              typeof value === 'function'
                                ? getTransferablePointer(value)
                                : // Intentionally ignoring `document.all`.
                                // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                                // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                                typeof value === 'undefined'
                                ? undefined
                                : value
                            : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL,
                        'get' in safeDesc
                            ? // Inline getTransferableValue().
                              (typeof getter === 'object' && getter !== null) ||
                              typeof getter === 'function'
                                ? getTransferablePointer(getter)
                                : getter
                            : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL,
                        'set' in safeDesc
                            ? // Inline getTransferableValue().
                              (typeof setter === 'object' && setter !== null) ||
                              typeof setter === 'function'
                                ? getTransferablePointer(setter)
                                : setter
                            : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL
                    );
                    return undefined;
                }
                let proto;
                try {
                    proto = ReflectGetPrototypeOf(target);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
                // Intentionally ignoring `document.all`.
                // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                if (typeof proto === 'undefined') {
                    return null;
                }
                return proto ? getTransferablePointer(proto) : proto;
            }
        );
        let foreignCallablesHooked = false;
        return (...hooks: Parameters<HooksCallback>) => {
            if (foreignCallablesHooked) {
                return;
            }
            foreignCallablesHooked = true;
            ({
                // 0: globalThisPointer,
                // 1: getSelectedTarget,
                // 2: getTransferableValue,
                // 3: callableGetPropertyValuePointer,
                // 4: callableEvaluate,
                // 5: callableLinkPointers,
                6: foreignCallablePushErrorTarget,
                7: foreignCallablePushTarget,
                8: foreignCallableApply,
                9: foreignCallableConstruct,
                10: foreignCallableDefineProperty,
                11: foreignCallableDeleteProperty,
                12: foreignCallableGet,
                13: foreignCallableGetOwnPropertyDescriptor,
                14: foreignCallableGetPrototypeOf,
                15: foreignCallableHas,
                16: foreignCallableIsExtensible,
                17: foreignCallableOwnKeys,
                18: foreignCallablePreventExtensions,
                19: foreignCallableSet,
                20: foreignCallableSetPrototypeOf,
                21: foreignCallableDebugInfo,
                // 22: callableDefineProperties,
                23: foreignCallableGetLazyPropertyDescriptorStateByTarget,
                24: foreignCallableGetTargetIntegrityTraits,
                25: foreignCallableGetToStringTagOfTarget,
                26: foreignCallableInstallErrorPrepareStackTrace,
                // 27: callableInstallLazyPropertyDescriptors,
                28: foreignCallableIsTargetLive,
                29: foreignCallableIsTargetRevoked,
                30: foreignCallableSerializeTarget,
                31: foreignCallableSetLazyPropertyDescriptorStateByTarget,
                32: foreignCallableBatchGetPrototypeOfAndGetOwnPropertyDescriptors,
                33: foreignCallableBatchGetPrototypeOfWhenHasNoOwnProperty,
                34: foreignCallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor,
            } = hooks);
            const applyTrapForZeroOrMoreArgs = createApplyOrConstructTrapForZeroOrMoreArgs(
                ProxyHandlerTraps.Apply
            );
            const applyTrapForOneOrMoreArgs = createApplyOrConstructTrapForOneOrMoreArgs(
                ProxyHandlerTraps.Apply
            );
            const applyTrapForTwoOrMoreArgs = createApplyOrConstructTrapForTwoOrMoreArgs(
                ProxyHandlerTraps.Apply
            );
            const applyTrapForThreeOrMoreArgs = createApplyOrConstructTrapForThreeOrMoreArgs(
                ProxyHandlerTraps.Apply
            );
            const applyTrapForFourOrMoreArgs = createApplyOrConstructTrapForFourOrMoreArgs(
                ProxyHandlerTraps.Apply
            );
            const applyTrapForAnyNumberOfArgs = createApplyOrConstructTrapForAnyNumberOfArgs(
                ProxyHandlerTraps.Apply
            );
            const constructTrapForZeroOrMoreArgs = createApplyOrConstructTrapForZeroOrMoreArgs(
                ProxyHandlerTraps.Construct
            );
            const constructTrapForOneOrMoreArgs = createApplyOrConstructTrapForOneOrMoreArgs(
                ProxyHandlerTraps.Construct
            );
            const constructTrapForTwoOrMoreArgs = createApplyOrConstructTrapForTwoOrMoreArgs(
                ProxyHandlerTraps.Construct
            );
            const constructTrapForThreeOrMoreArgs = createApplyOrConstructTrapForThreeOrMoreArgs(
                ProxyHandlerTraps.Construct
            );
            const constructTrapForFourOrMoreArgs = createApplyOrConstructTrapForFourOrMoreArgs(
                ProxyHandlerTraps.Construct
            );
            const constructTrapForAnyNumberOfArgs = createApplyOrConstructTrapForAnyNumberOfArgs(
                ProxyHandlerTraps.Construct
            );
            // A minification friendly way to get the trap names.
            const trapNames = ObjectKeys({
                applyTrapForZeroOrMoreArgs,
                applyTrapForOneOrMoreArgs,
                applyTrapForTwoOrMoreArgs,
                applyTrapForThreeOrMoreArgs,
                applyTrapForFourOrMoreArgs,
                applyTrapForAnyNumberOfArgs,
                constructTrapForZeroOrMoreArgs,
                constructTrapForOneOrMoreArgs,
                constructTrapForTwoOrMoreArgs,
                constructTrapForThreeOrMoreArgs,
                constructTrapForFourOrMoreArgs,
                constructTrapForAnyNumberOfArgs,
            });
            arityToApplyTrapNameRegistry[0] = trapNames[0];
            arityToApplyTrapNameRegistry[1] = trapNames[1];
            arityToApplyTrapNameRegistry[2] = trapNames[2];
            arityToApplyTrapNameRegistry[3] = trapNames[3];
            arityToApplyTrapNameRegistry[4] = trapNames[4];
            arityToApplyTrapNameRegistry.n = trapNames[5];
            arityToConstructTrapNameRegistry[0] = trapNames[6];
            arityToConstructTrapNameRegistry[1] = trapNames[7];
            arityToConstructTrapNameRegistry[2] = trapNames[8];
            arityToConstructTrapNameRegistry[3] = trapNames[9];
            arityToConstructTrapNameRegistry[4] = trapNames[10];
            arityToConstructTrapNameRegistry.n = trapNames[11];

            const { prototype: BoundaryProxyHandlerProto } = BoundaryProxyHandler;
            BoundaryProxyHandlerProto[arityToApplyTrapNameRegistry[0]] = applyTrapForZeroOrMoreArgs;
            BoundaryProxyHandlerProto[arityToApplyTrapNameRegistry[1]] = applyTrapForOneOrMoreArgs;
            BoundaryProxyHandlerProto[arityToApplyTrapNameRegistry[2]] = applyTrapForTwoOrMoreArgs;
            BoundaryProxyHandlerProto[arityToApplyTrapNameRegistry[3]] =
                applyTrapForThreeOrMoreArgs;
            BoundaryProxyHandlerProto[arityToApplyTrapNameRegistry[4]] = applyTrapForFourOrMoreArgs;
            BoundaryProxyHandlerProto[arityToApplyTrapNameRegistry.n] = applyTrapForAnyNumberOfArgs;
            BoundaryProxyHandlerProto[arityToConstructTrapNameRegistry[0]] =
                constructTrapForZeroOrMoreArgs;
            BoundaryProxyHandlerProto[arityToConstructTrapNameRegistry[1]] =
                constructTrapForOneOrMoreArgs;
            BoundaryProxyHandlerProto[arityToConstructTrapNameRegistry[2]] =
                constructTrapForTwoOrMoreArgs;
            BoundaryProxyHandlerProto[arityToConstructTrapNameRegistry[3]] =
                constructTrapForThreeOrMoreArgs;
            BoundaryProxyHandlerProto[arityToConstructTrapNameRegistry[4]] =
                constructTrapForFourOrMoreArgs;
            BoundaryProxyHandlerProto[arityToConstructTrapNameRegistry.n] =
                constructTrapForAnyNumberOfArgs;
            if (DEV_MODE) {
                // @ts-ignore: Prevent read-only property error.
                BoundaryProxyHandlerProto.color = color;
            }
            ReflectSetPrototypeOf(BoundaryProxyHandlerProto, null);
            // Future optimization: Hoping proxies with frozen handlers can be faster.
            ObjectFreeze(BoundaryProxyHandlerProto);
        };
    };
    /* eslint-enable prefer-object-spread */
}
