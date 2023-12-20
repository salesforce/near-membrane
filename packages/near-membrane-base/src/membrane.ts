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
import { toSafeWeakMap, WeakMapCtor } from '@locker/near-membrane-shared';
import type { Getter, ProxyTarget, Setter } from '@locker/near-membrane-shared';
import type {
    CallableApply,
    CallableBatchGetPrototypeOfAndGetOwnPropertyDescriptors,
    CallableBatchGetPrototypeOfWhenHasNoOwnProperty,
    CallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor,
    CallableConstruct,
    CallableDebugInfo,
    CallableDefineProperties,
    CallableDefineProperty,
    CallableDeleteProperty,
    CallableDescriptorCallback,
    CallableDescriptorsCallback,
    CallableEvaluate,
    CallableGet,
    CallableGetLazyPropertyDescriptorStateByTarget,
    CallableGetOwnPropertyDescriptor,
    CallableGetPropertyValue,
    CallableGetPrototypeOf,
    CallableGetTargetIntegrityTraits,
    CallableGetToStringTagOfTarget,
    CallableHas,
    CallableInstallErrorPrepareStackTrace,
    CallableInstallLazyPropertyDescriptors,
    CallableIsExtensible,
    CallableIsTargetLive,
    CallableIsTargetRevoked,
    CallableNonConfigurableDescriptorCallback,
    CallableOwnKeys,
    CallablePreventExtensions,
    CallablePushErrorTarget,
    CallablePushTarget,
    CallableSerializeTarget,
    CallableSet,
    CallableSetLazyPropertyDescriptorStateByTarget,
    CallableSetPrototypeOf,
    CallableTrackAsFastTarget,
    ForeignPropertyDescriptor,
    GetSelectedTarget,
    GlobalThisGetter,
    HooksCallback,
    HooksOptions,
    Pointer,
    PointerOrPrimitive,
    Primitive,
    SerializedValue,
    ShadowTarget,
} from './types';

const proxyTargetToLazyPropertyDescriptorStateMap: WeakMap<ProxyTarget, object> = toSafeWeakMap(
    new WeakMapCtor()
);

// istanbul ignore next
export function createMembraneMarshall(
    globalObject?: typeof globalThis | (WindowProxy & typeof globalThis)
) {
    /* eslint-disable prefer-object-spread */
    const ArrayCtor = Array;
    const ArrayBufferCtor = ArrayBuffer;
    const ErrorCtor = Error;
    const NumberCtor = Number;
    const ObjectCtor = Object;
    const ProxyCtor = Proxy;
    const ReflectRef = Reflect;
    const RegExpCtor = RegExp;
    const StringCtor = String;
    const SymbolCtor = Symbol;
    const TypeErrorCtor = TypeError;
    // eslint-disable-next-line @typescript-eslint/no-shadow, no-shadow
    const WeakMapCtor = WeakMap;
    const WeakSetCtor = WeakSet;
    const { for: SymbolFor, toStringTag: SymbolToStringTag } = SymbolCtor;
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
        hasOwnProperty: ObjectProtoHasOwnProperty,
        propertyIsEnumerable: ObjectProtoPropertyIsEnumerable,
        toString: ObjectProtoToString,
    } = ObjectProto;
    const { hasOwn: OriginalObjectHasOwn } = ObjectCtor as any;
    const {
        __defineGetter__: ObjectProtoDefineGetter,
        __defineSetter__: ObjectProtoDefineSetter,
        __lookupGetter__: ObjectProtoLookupGetter,
        __lookupSetter__: ObjectProtoLookupSetter,
    } = ObjectProto as any;
    const ObjectHasOwn =
        typeof OriginalObjectHasOwn === 'function'
            ? (OriginalObjectHasOwn as (object: any, key: PropertyKey) => boolean)
            : (object: any, key: PropertyKey): boolean =>
                  ReflectApply(ObjectProtoHasOwnProperty, object, [key]);
    const globalThisRef =
        globalObject ??
        // Support for globalThis was added in Chrome 71.
        // https://caniuse.com/mdn-javascript_builtins_globalthisfor
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
    // @rollup/plugin-replace replaces `DEV_MODE` references.
    const DEV_MODE = true;
    const IS_IN_SHADOW_REALM = typeof globalObject !== 'object' || globalObject === null;
    const IS_NOT_IN_SHADOW_REALM = !IS_IN_SHADOW_REALM;
    const LOCKER_DEBUG_MODE_SYMBOL = IS_NOT_IN_SHADOW_REALM
        ? SymbolFor('@@lockerDebugMode')
        : undefined;
    const LOCKER_IDENTIFIER_MARKER = '$LWS';
    const LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL = IS_NOT_IN_SHADOW_REALM
        ? SymbolFor('@@lockerNearMembraneSerializedValue')
        : undefined;
    const LOCKER_NEAR_MEMBRANE_SYMBOL = IS_NOT_IN_SHADOW_REALM
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

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const LOCKER_UNMINIFIED_FLAG = `${(function LOCKER_UNMINIFIED_FLAG() {
        return LOCKER_UNMINIFIED_FLAG.name;
    })()}`.includes('LOCKER_UNMINIFIED_FLAG');
    // Indicate whether debug support is available.
    const LOCKER_DEBUGGABLE_FLAG = LOCKER_UNMINIFIED_FLAG && IS_NOT_IN_SHADOW_REALM;
    const ERR_ILLEGAL_PROPERTY_ACCESS = 'Illegal property access.';
    // BigInt is not supported in Safari 13.1.
    // https://caniuse.com/bigint
    const FLAGS_REG_EXP = IS_IN_SHADOW_REALM ? /\w*$/ : undefined;
    // Minification safe references to the private `BoundaryProxyHandler`
    // 'apply' and 'construct' trap variant's property names.
    let MINIFICATION_SAFE_TRAP_PROPERTY_NAMES: string[] | undefined;
    const SUPPORTS_BIG_INT = typeof BigInt === 'function';
    const { isArray: isArrayOrThrowForRevoked } = ArrayCtor;
    const {
        includes: ArrayProtoIncludes,
        indexOf: ArrayProtoIndexOf,
        slice: ArrayProtoSlice,
    } = ArrayCtor.prototype;
    const { isView: ArrayBufferIsView } = ArrayBufferCtor;
    const BigIntProtoValueOf = SUPPORTS_BIG_INT ? BigInt.prototype.valueOf : undefined;
    const { valueOf: BooleanProtoValueOf } = Boolean.prototype;
    const { toString: ErrorProtoToString } = ErrorCtor.prototype;
    const { bind: FunctionProtoBind, toString: FunctionProtoToString } = Function.prototype;
    const { stringify: JSONStringify } = JSON;
    const { isInteger: NumberIsInteger } = NumberCtor;
    const { valueOf: NumberProtoValueOf } = NumberCtor.prototype;
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
        ? ReflectApply(ObjectProtoLookupGetter, RegExpProto, ['flags']) ??
          function flags(this: RegExp) {
              const string = ReflectApply(RegExProtoToString, this, []);
              return ReflectApply(RegExpProtoExec, FLAGS_REG_EXP!, [string])![0] as string;
          }
        : undefined;
    const RegExpProtoSourceGetter: () => string = ReflectApply(
        ObjectProtoLookupGetter,
        RegExpProto,
        ['source']
    );
    const {
        replace: StringProtoReplace,
        slice: StringProtoSlice,
        valueOf: StringProtoValueOf,
    } = StringCtor.prototype;
    const { toString: SymbolProtoToString, valueOf: SymbolProtoValueOf } = SymbolCtor.prototype;
    const BigInt64ArrayProto = globalThisRef.BigInt64Array?.prototype;
    const BigUint64ArrayProto = globalThisRef.BigUint64Array?.prototype;
    const { prototype: Float32ArrayProto } = Float32Array;
    const { prototype: Float64ArrayProto } = Float64Array;
    const { prototype: Int8ArrayProto } = Int8Array;
    const { prototype: Int16ArrayProto } = Int16Array;
    const { prototype: Int32ArrayProto } = Int32Array;
    const { prototype: Uint8ArrayProto } = Uint8Array;
    const { prototype: Uint16ArrayProto } = Uint16Array;
    const { prototype: Uint32ArrayProto } = Uint32Array;
    // eslint-disable-next-line no-proto
    const TypedArrayProto = (Uint8ArrayProto as any).__proto__;
    const TypedArrayProtoLengthGetter: () => number = ReflectApply(
        ObjectProtoLookupGetter,
        TypedArrayProto,
        ['length']
    );
    const { prototype: WeakMapProto } = WeakMapCtor;
    const {
        delete: WeakMapProtoDelete,
        has: WeakMapProtoHas,
        set: WeakMapProtoSet,
        [SymbolToStringTag]: WeakMapProtoSymbolToStringTag,
    } = WeakMapProto as any;
    const { prototype: WeakSetProto } = WeakSetCtor;
    const {
        add: WeakSetProtoAdd,
        has: WeakSetProtoHas,
        delete: WeakSetProtoDelete,
        [SymbolToStringTag]: WeakSetProtoSymbolToStringTag,
    } = WeakSetProto as any;
    const consoleObject =
        IS_NOT_IN_SHADOW_REALM && typeof console === 'object' && console !== null
            ? console
            : undefined;
    const consoleInfo = consoleObject?.info;
    const localEval = IS_IN_SHADOW_REALM ? eval : undefined;

    // Install flags to ensure things are installed once per realm.
    let installedErrorPrepareStackTraceFlag = false;
    let installedPropertyDescriptorMethodWrappersFlag = false;

    // eslint-disable-next-line no-shadow
    const enum PreventExtensionsResult {
        None,
        Extensible = 1 << 0,
        False = 1 << 1,
        True = 1 << 2,
    }
    // eslint-disable-next-line no-shadow
    const enum ProxyHandlerTraps {
        None,
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
        None,
        IsNotExtensible = 1 << 0,
        IsSealed = 1 << 1,
        IsFrozen = 1 << 2,
        Revoked = 1 << 3,
    }
    // eslint-disable-next-line no-shadow
    const enum TargetTraits {
        None,
        IsArray = 1 << 0,
        IsArrayBufferView = 1 << 1,
        IsFunction = 1 << 2,
        IsArrowFunction = 1 << 3,
        IsObject = 1 << 4,
        IsTypedArray = 1 << 5,
        Revoked = 1 << 6,
    }

    function alwaysFalse() {
        return false;
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
                  try {
                      ErrorCtor.prepareStackTrace = (_error: Error, callSites: NodeJS.CallSite[]) =>
                          callSites;
                      const callSites = new ErrorCtor().stack as string | NodeJS.CallSite[];
                      ReflectDeleteProperty(ErrorCtor, 'prepareStackTrace');
                      return isArrayOrThrowForRevoked(callSites) && callSites.length > 0
                          ? callSites[0]?.constructor
                          : undefined;
                      // eslint-disable-next-line no-empty
                  } catch {}
                  return undefined;
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
                      ]) as string
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
                      stackTrace = ReflectApply(ErrorProtoToString, error, []) as string;
                  } catch {
                      stackTrace = '<error>';
                  }
                  let consecutive = false;
                  for (let i = 0, { length } = callSites; i < length; i += 1) {
                      const callSite = callSites[i];
                      const funcName: string | undefined = ReflectApply(
                          CallSiteProtoGetFunctionName,
                          callSite,
                          []
                      );
                      let isMarked = false;
                      if (
                          typeof funcName === 'string' &&
                          funcName !== 'eval' &&
                          (ReflectApply(RegExpProtoTest, lockerFunctionNameMarkerRegExp, [
                              funcName,
                          ]) as boolean)
                      ) {
                          isMarked = true;
                      }
                      if (!isMarked) {
                          const evalOrigin: string | undefined = ReflectApply(
                              CallSiteProtoGetEvalOrigin,
                              callSite,
                              []
                          );
                          if (
                              typeof evalOrigin === 'string' &&
                              (ReflectApply(RegExpProtoTest, lockerFunctionNameMarkerRegExp, [
                                  evalOrigin,
                              ]) as boolean)
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
                          stackTrace += `\n    at ${
                              ReflectApply(CallSiteProtoToString, callSite, []) as string
                          }`;
                          // eslint-disable-next-line no-empty
                      } catch {}
                  }
                  return stackTrace;
              };
              try {
                  // Error.prepareStackTrace cannot be a bound or proxy wrapped
                  // function, so to obscure its source we wrap the call to
                  // formatStackTrace().
                  ErrorCtor.prepareStackTrace = function prepareStackTrace(
                      error: Error,
                      callSites: NodeJS.CallSite[]
                  ) {
                      return formatStackTrace(error, callSites);
                  };
                  // eslint-disable-next-line no-empty
              } catch {}
              try {
                  const { stackTraceLimit } = ErrorCtor;
                  if (
                      typeof stackTraceLimit !== 'number' ||
                      stackTraceLimit < LOCKER_STACK_TRACE_LIMIT
                  ) {
                      ErrorCtor.stackTraceLimit = LOCKER_STACK_TRACE_LIMIT;
                  }
                  // eslint-disable-next-line no-empty
              } catch {}
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
                  const source: string = ReflectApply(RegExpProtoSourceGetter, value, []);
                  return JSONStringify({
                      __proto__: null,
                      flags: ReflectApply(RegExpProtoFlagsGetter!, value, []) as string,
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
              const brand: string = ReflectApply(ObjectProtoToString, target, []);
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

    function toSafeTemplateStringValue(value: any): string {
        if (typeof value === 'string') {
            return value;
        }
        try {
            if (typeof value === 'object' && value !== null) {
                const result: string = ReflectApply(ObjectProtoToString, value, []);
                return result === '[object Symbol]'
                    ? ReflectApply(SymbolProtoToString, value, [])
                    : result;
            }
            if (typeof value === 'function') {
                return ReflectApply(FunctionProtoToString, value, []);
            }
            // Attempt to coerce `value` to a string with the String() constructor.
            // Section 22.1.1.1 String ( value )
            // https://tc39.es/ecma262/#sec-string-constructor-string-value
            return StringCtor(value);
            // eslint-disable-next-line no-empty
        } catch {}
        return '[Object Unknown]';
    }

    // eslint-disable-next-line @typescript-eslint/no-shadow, no-shadow
    function toSafeWeakMap<T extends WeakMap<any, any>>(weakMap: T): T {
        ReflectSetPrototypeOf(weakMap, null);
        weakMap.delete = WeakMapProtoDelete;
        weakMap.has = WeakMapProtoHas;
        weakMap.set = WeakMapProtoSet;
        (weakMap as any)[SymbolToStringTag] = WeakMapProtoSymbolToStringTag;
        ReflectSetPrototypeOf(weakMap, WeakMapProto);
        return weakMap;
    }

    function toSafeWeakSet<T extends WeakSet<any>>(weakSet: T): T {
        ReflectSetPrototypeOf(weakSet, null);
        weakSet.add = WeakSetProtoAdd;
        weakSet.delete = WeakSetProtoDelete;
        weakSet.has = WeakSetProtoHas;
        (weakSet as any)[SymbolToStringTag] = WeakSetProtoSymbolToStringTag;
        ReflectSetPrototypeOf(weakSet, WeakSetProto);
        return weakSet;
    }

    return function createHooksCallback(
        color: string,
        foreignCallableHooksCallback: HooksCallback,
        options?: HooksOptions
    ): HooksCallback {
        if (IS_IN_SHADOW_REALM) {
            options = undefined;
        }
        const {
            distortionCallback,
            liveTargetCallback,
            revokedProxyCallback,
            // eslint-disable-next-line prefer-object-spread
        } = ObjectAssign({ __proto__: null }, options);

        const applyTrapNameRegistry = {
            // Populated in the returned connector function below.
            __proto__: null,
            0: undefined,
            1: undefined,
            2: undefined,
            3: undefined,
            4: undefined,
            n: undefined,
        } as unknown as Record<number | string, string>;

        const constructTrapNameRegistry = {
            // Populated in the returned connector function below.
            __proto__: null,
            0: undefined,
            1: undefined,
            2: undefined,
            3: undefined,
            4: undefined,
            n: undefined,
        } as unknown as Record<number | string, string>;

        const lazyPropertyDescriptorStateCache = toSafeWeakMap(
            new WeakMapCtor<ProxyTarget, object>()
        );

        const proxyPointerCache = toSafeWeakMap(new WeakMapCtor<ProxyTarget, Pointer>());

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
        let foreignCallableGetPropertyValue: CallableGetPropertyValue;
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

        let fastForeignTargetPointers: WeakSet<Pointer>;
        let foreignPointerBigInt64ArrayProto: Pointer;
        let foreignPointerBigUint64ArrayProto: Pointer;
        let foreignPointerFloat32ArrayProto: Pointer;
        let foreignPointerFloat64ArrayProto: Pointer;
        let foreignPointerInt8ArrayProto: Pointer;
        let foreignPointerInt16ArrayProto: Pointer;
        let foreignPointerInt32ArrayProto: Pointer;
        let foreignPointerObjectProto: Pointer;
        let foreignPointerTypedArrayProto: Pointer;
        let foreignPointerUint8ArrayProto: Pointer;
        let foreignPointerUint16ArrayProto: Pointer;
        let foreignPointerUint32ArrayProto: Pointer;
        let selectedTarget: undefined | ProxyTarget;

        let lastProxyTrapCalled = ProxyHandlerTraps.None;
        let handshakePropertyFlag = false;
        let useFastForeignTargetPath = IS_IN_SHADOW_REALM;
        let useFastForeignTargetPathForTypedArrays = IS_IN_SHADOW_REALM;

        const activateLazyOwnPropertyDefinition = IS_IN_SHADOW_REALM
            ? (target: object, key: PropertyKey, state: object) => {
                  (state as any)[key] = false;
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
                              getterPointer,
                              setterPointer
                          ) => {
                              safeDesc = createDescriptorFromMeta(
                                  configurable,
                                  enumerable,
                                  writable,
                                  valuePointer,
                                  getterPointer,
                                  setterPointer
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
                      ReflectDeleteProperty(target, key);
                  }
              }
            : noop;

        let checkDebugMode = LOCKER_DEBUGGABLE_FLAG
            ? () => {
                  try {
                      if (ObjectHasOwn(globalThisRef, LOCKER_DEBUG_MODE_SYMBOL!)) {
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

        const clearFastForeignTargetPointers = IS_IN_SHADOW_REALM
            ? () => {
                  fastForeignTargetPointers = toSafeWeakSet(new WeakSetCtor<Pointer>());
              }
            : noop;

        function copyForeignOwnPropertyDescriptorsAndPrototypeToShadowTarget(
            foreignTargetPointer: Pointer,
            shadowTarget: ShadowTarget
        ): void {
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
                                descriptorTuples[i + 5] as PointerOrPrimitive, // getterPointer
                                descriptorTuples[i + 6] as PointerOrPrimitive // setterPointer
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
        }

        function createApplyOrConstructTrapForZeroOrMoreArgs(proxyTrapEnum: ProxyHandlerTraps) {
            const isApplyTrap = proxyTrapEnum & ProxyHandlerTraps.Apply;
            const arityToApplyOrConstructTrapNameRegistry = isApplyTrap
                ? applyTrapNameRegistry
                : constructTrapNameRegistry;
            const foreignCallableApplyOrConstruct = isApplyTrap
                ? foreignCallableApply
                : foreignCallableConstruct;
            return function applyOrConstructTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                thisArgOrArgs: any,
                argsOrNewTarget: any
            ) {
                lastProxyTrapCalled = proxyTrapEnum;
                const args = isApplyTrap ? argsOrNewTarget : thisArgOrArgs;
                const { length } = args;
                if (length !== 0) {
                    return (this as any)[
                        arityToApplyOrConstructTrapNameRegistry[length] ??
                            arityToApplyOrConstructTrapNameRegistry.n
                    ](_shadowTarget, thisArgOrArgs, argsOrNewTarget);
                }
                // @ts-ignore: Prevent private property access error.
                const { foreignTargetPointer } = this;
                const thisArgOrNewTarget = isApplyTrap ? thisArgOrArgs : argsOrNewTarget;
                let pointerOrPrimitive: PointerOrPrimitive;
                try {
                    pointerOrPrimitive = foreignCallableApplyOrConstruct(
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
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    throw errorToThrow;
                }
                let result: any;
                if (typeof pointerOrPrimitive === 'function') {
                    pointerOrPrimitive();
                    result = selectedTarget;
                    selectedTarget = undefined;
                } else {
                    result = pointerOrPrimitive;
                }
                return result;
            };
        }

        function createApplyOrConstructTrapForOneOrMoreArgs(proxyTrapEnum: ProxyHandlerTraps) {
            const isApplyTrap = proxyTrapEnum & ProxyHandlerTraps.Apply;
            const arityToApplyOrConstructTrapNameRegistry = isApplyTrap
                ? applyTrapNameRegistry
                : constructTrapNameRegistry;
            const foreignCallableApplyOrConstruct = isApplyTrap
                ? foreignCallableApply
                : foreignCallableConstruct;
            return function applyOrConstructTrapForOneOrMoreArgs(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                thisArgOrArgs: any,
                argsOrNewTarget: any
            ) {
                lastProxyTrapCalled = proxyTrapEnum;
                const args = isApplyTrap ? argsOrNewTarget : thisArgOrArgs;
                const { length } = args;
                if (length !== 1) {
                    return (this as any)[
                        arityToApplyOrConstructTrapNameRegistry[length] ??
                            arityToApplyOrConstructTrapNameRegistry.n
                    ](_shadowTarget, thisArgOrArgs, argsOrNewTarget);
                }
                // @ts-ignore: Prevent private property access error.
                const { foreignTargetPointer } = this;
                const thisArgOrNewTarget = isApplyTrap ? thisArgOrArgs : argsOrNewTarget;
                let pointerOrPrimitive: PointerOrPrimitive;
                try {
                    const { 0: arg0 } = args;
                    pointerOrPrimitive = foreignCallableApplyOrConstruct(
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
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    throw errorToThrow;
                }
                let result: any;
                if (typeof pointerOrPrimitive === 'function') {
                    pointerOrPrimitive();
                    result = selectedTarget;
                    selectedTarget = undefined;
                } else {
                    result = pointerOrPrimitive;
                }
                return result;
            };
        }

        function createApplyOrConstructTrapForTwoOrMoreArgs(proxyTrapEnum: ProxyHandlerTraps) {
            const isApplyTrap = proxyTrapEnum & ProxyHandlerTraps.Apply;
            const arityToApplyOrConstructTrapNameRegistry = isApplyTrap
                ? applyTrapNameRegistry
                : constructTrapNameRegistry;
            const foreignCallableApplyOrConstruct = isApplyTrap
                ? foreignCallableApply
                : foreignCallableConstruct;
            return function applyOrConstructTrapForTwoOrMoreArgs(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                thisArgOrArgs: any,
                argsOrNewTarget: any
            ) {
                lastProxyTrapCalled = proxyTrapEnum;
                const args = isApplyTrap ? argsOrNewTarget : thisArgOrArgs;
                const { length } = args;
                if (length !== 2) {
                    return (this as any)[
                        arityToApplyOrConstructTrapNameRegistry[length] ??
                            arityToApplyOrConstructTrapNameRegistry.n
                    ](_shadowTarget, thisArgOrArgs, argsOrNewTarget);
                }
                // @ts-ignore: Prevent private property access error.
                const { foreignTargetPointer } = this;
                const thisArgOrNewTarget = isApplyTrap ? thisArgOrArgs : argsOrNewTarget;
                let pointerOrPrimitive: PointerOrPrimitive;
                try {
                    const { 0: arg0, 1: arg1 } = args;
                    pointerOrPrimitive = foreignCallableApplyOrConstruct(
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
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    throw errorToThrow;
                }
                let result: any;
                if (typeof pointerOrPrimitive === 'function') {
                    pointerOrPrimitive();
                    result = selectedTarget;
                    selectedTarget = undefined;
                } else {
                    result = pointerOrPrimitive;
                }
                return result;
            };
        }

        function createApplyOrConstructTrapForThreeOrMoreArgs(proxyTrapEnum: ProxyHandlerTraps) {
            const isApplyTrap = proxyTrapEnum & ProxyHandlerTraps.Apply;
            const arityToApplyOrConstructTrapNameRegistry = isApplyTrap
                ? applyTrapNameRegistry
                : constructTrapNameRegistry;
            const foreignCallableApplyOrConstruct = isApplyTrap
                ? foreignCallableApply
                : foreignCallableConstruct;
            return function applyOrConstructTrapForTwoOrMoreArgs(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                thisArgOrArgs: any,
                argsOrNewTarget: any
            ) {
                lastProxyTrapCalled = proxyTrapEnum;
                const args = isApplyTrap ? argsOrNewTarget : thisArgOrArgs;
                const { length } = args;
                if (length !== 3) {
                    return (this as any)[
                        arityToApplyOrConstructTrapNameRegistry[length] ??
                            arityToApplyOrConstructTrapNameRegistry.n
                    ](_shadowTarget, thisArgOrArgs, argsOrNewTarget);
                }
                // @ts-ignore: Prevent private property access error.
                const { foreignTargetPointer } = this;
                const thisArgOrNewTarget = isApplyTrap ? thisArgOrArgs : argsOrNewTarget;
                let pointerOrPrimitive: PointerOrPrimitive;
                try {
                    const { 0: arg0, 1: arg1, 2: arg2 } = args;
                    pointerOrPrimitive = foreignCallableApplyOrConstruct(
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
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    throw errorToThrow;
                }
                let result: any;
                if (typeof pointerOrPrimitive === 'function') {
                    pointerOrPrimitive();
                    result = selectedTarget;
                    selectedTarget = undefined;
                } else {
                    result = pointerOrPrimitive;
                }
                return result;
            };
        }

        function createApplyOrConstructTrapForFourOrMoreArgs(proxyTrapEnum: ProxyHandlerTraps) {
            const isApplyTrap = proxyTrapEnum & ProxyHandlerTraps.Apply;
            const arityToApplyOrConstructTrapNameRegistry = isApplyTrap
                ? applyTrapNameRegistry
                : constructTrapNameRegistry;
            const foreignCallableApplyOrConstruct = isApplyTrap
                ? foreignCallableApply
                : foreignCallableConstruct;
            return function applyOrConstructTrapForTwoOrMoreArgs(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                thisArgOrArgs: any,
                argsOrNewTarget: any
            ) {
                lastProxyTrapCalled = proxyTrapEnum;
                const args = isApplyTrap ? argsOrNewTarget : thisArgOrArgs;
                const { length } = args;
                if (length !== 4) {
                    return (this as any)[
                        arityToApplyOrConstructTrapNameRegistry[length] ??
                            arityToApplyOrConstructTrapNameRegistry.n
                    ](_shadowTarget, thisArgOrArgs, argsOrNewTarget);
                }
                // @ts-ignore: Prevent private property access error.
                const { foreignTargetPointer } = this;
                const thisArgOrNewTarget = isApplyTrap ? thisArgOrArgs : argsOrNewTarget;
                let pointerOrPrimitive: PointerOrPrimitive;
                try {
                    const { 0: arg0, 1: arg1, 2: arg2, 3: arg3 } = args;
                    pointerOrPrimitive = foreignCallableApplyOrConstruct(
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
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    throw errorToThrow;
                }
                let result: any;
                if (typeof pointerOrPrimitive === 'function') {
                    pointerOrPrimitive();
                    result = selectedTarget;
                    selectedTarget = undefined;
                } else {
                    result = pointerOrPrimitive;
                }
                return result;
            };
        }

        function createApplyOrConstructTrapForFiveOrMoreArgs(proxyTrapEnum: ProxyHandlerTraps) {
            const isApplyTrap = proxyTrapEnum & ProxyHandlerTraps.Apply;
            const arityToApplyOrConstructTrapNameRegistry = isApplyTrap
                ? applyTrapNameRegistry
                : constructTrapNameRegistry;
            const foreignCallableApplyOrConstruct = isApplyTrap
                ? foreignCallableApply
                : foreignCallableConstruct;
            return function applyOrConstructTrapForTwoOrMoreArgs(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                thisArgOrArgs: any,
                argsOrNewTarget: any
            ) {
                lastProxyTrapCalled = proxyTrapEnum;
                const args = isApplyTrap ? argsOrNewTarget : thisArgOrArgs;
                const { length } = args;
                if (length !== 5) {
                    return (this as any)[
                        arityToApplyOrConstructTrapNameRegistry[length] ??
                            arityToApplyOrConstructTrapNameRegistry.n
                    ](_shadowTarget, thisArgOrArgs, argsOrNewTarget);
                }
                // @ts-ignore: Prevent private property access error.
                const { foreignTargetPointer } = this;
                const thisArgOrNewTarget = isApplyTrap ? thisArgOrArgs : argsOrNewTarget;
                let pointerOrPrimitive: PointerOrPrimitive;
                try {
                    const { 0: arg0, 1: arg1, 2: arg2, 3: arg3, 4: arg4 } = args;
                    pointerOrPrimitive = foreignCallableApplyOrConstruct(
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
                            : arg3,
                        // Inline getTransferableValue().
                        (typeof arg4 === 'object' && arg4 !== null) || typeof arg4 === 'function'
                            ? getTransferablePointer(arg4)
                            : // Intentionally ignoring `document.all`.
                            // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                            // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                            typeof arg4 === 'undefined'
                            ? undefined
                            : arg4
                    );
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    throw errorToThrow;
                }
                let result: any;
                if (typeof pointerOrPrimitive === 'function') {
                    pointerOrPrimitive();
                    result = selectedTarget;
                    selectedTarget = undefined;
                } else {
                    result = pointerOrPrimitive;
                }
                return result;
            };
        }

        function createApplyOrConstructTrapForAnyNumberOfArgs(proxyTrapEnum: ProxyHandlerTraps) {
            const isApplyTrap = proxyTrapEnum & ProxyHandlerTraps.Apply;
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
                const thisArgOrNewTarget = isApplyTrap ? thisArgOrArgs : argsOrNewTarget;
                let combinedOffset = 2;
                const combinedArgs = new ArrayCtor(length + combinedOffset);
                combinedArgs[0] = foreignTargetPointer;
                let pointerOrPrimitive: PointerOrPrimitive;
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
                    pointerOrPrimitive = ReflectApply(
                        foreignCallableApplyOrConstruct,
                        undefined,
                        combinedArgs
                    ) as PointerOrPrimitive;
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    throw errorToThrow;
                }
                let result: any;
                if (typeof pointerOrPrimitive === 'function') {
                    pointerOrPrimitive();
                    result = selectedTarget;
                    selectedTarget = undefined;
                } else {
                    result = pointerOrPrimitive;
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
                if (typeof getterPointerOrPrimitive === 'function') {
                    getterPointerOrPrimitive();
                    safeDesc.get = selectedTarget as Getter;
                    selectedTarget = undefined;
                } else {
                    safeDesc.get = undefined;
                }
            }
            if (setterPointerOrPrimitive !== LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL) {
                if (typeof setterPointerOrPrimitive === 'function') {
                    setterPointerOrPrimitive();
                    safeDesc.set = selectedTarget as Setter;
                    selectedTarget = undefined;
                } else {
                    safeDesc.set = undefined;
                }
            }
            if (valuePointerOrPrimitive !== LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL) {
                if (typeof valuePointerOrPrimitive === 'function') {
                    valuePointerOrPrimitive();
                    safeDesc.value = selectedTarget;
                    selectedTarget = undefined;
                } else {
                    safeDesc.value = valuePointerOrPrimitive;
                }
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

        const disableFastForeignTargetPointers = IS_IN_SHADOW_REALM
            ? () => {
                  useFastForeignTargetPath = false;
                  useFastForeignTargetPathForTypedArrays = false;
                  clearFastForeignTargetPointers();
              }
            : noop;

        const getLazyPropertyDescriptorStateByTarget = IS_IN_SHADOW_REALM
            ? (target: ProxyTarget): object | undefined => {
                  let state: any = lazyPropertyDescriptorStateCache.get(target);
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
                              lazyPropertyDescriptorStateCache.set(target, state);
                          }
                      }
                  }
                  return state;
              }
            : noop;

        const isForeignPointerOfObjectProto = IS_IN_SHADOW_REALM
            ? // eslint-disable-next-line no-return-assign
              (foreignTargetPointer: Pointer): boolean =>
                  foreignTargetPointer ===
                  (foreignPointerObjectProto === undefined
                      ? (foreignPointerObjectProto = getTransferablePointer(ObjectProto))
                      : foreignPointerObjectProto)
            : alwaysFalse;

        const isForeignPointerOfTypedArrayProto = IS_IN_SHADOW_REALM
            ? // eslint-disable-next-line no-return-assign
              (foreignTargetPointer: Pointer): boolean =>
                  foreignTargetPointer ===
                      (foreignPointerFloat32ArrayProto === undefined
                          ? (foreignPointerFloat32ArrayProto =
                                getTransferablePointer(Float32ArrayProto))
                          : foreignPointerFloat32ArrayProto) ||
                  foreignTargetPointer ===
                      (foreignPointerFloat64ArrayProto === undefined
                          ? (foreignPointerFloat64ArrayProto =
                                getTransferablePointer(Float64ArrayProto))
                          : foreignPointerFloat64ArrayProto) ||
                  foreignTargetPointer ===
                      (foreignPointerInt8ArrayProto === undefined
                          ? (foreignPointerInt8ArrayProto = getTransferablePointer(Int8ArrayProto))
                          : foreignPointerInt8ArrayProto) ||
                  foreignTargetPointer ===
                      (foreignPointerInt16ArrayProto === undefined
                          ? (foreignPointerInt16ArrayProto =
                                getTransferablePointer(Int16ArrayProto))
                          : foreignPointerInt16ArrayProto) ||
                  foreignTargetPointer ===
                      (foreignPointerInt32ArrayProto === undefined
                          ? (foreignPointerInt32ArrayProto =
                                getTransferablePointer(Int32ArrayProto))
                          : foreignPointerInt32ArrayProto) ||
                  foreignTargetPointer ===
                      (foreignPointerUint8ArrayProto === undefined
                          ? (foreignPointerUint8ArrayProto =
                                getTransferablePointer(Uint8ArrayProto))
                          : foreignPointerUint8ArrayProto) ||
                  foreignTargetPointer ===
                      (foreignPointerUint16ArrayProto === undefined
                          ? (foreignPointerUint16ArrayProto =
                                getTransferablePointer(Uint16ArrayProto))
                          : foreignPointerUint16ArrayProto) ||
                  foreignTargetPointer ===
                      (foreignPointerUint32ArrayProto === undefined
                          ? (foreignPointerUint32ArrayProto =
                                getTransferablePointer(Uint32ArrayProto))
                          : foreignPointerUint32ArrayProto) ||
                  foreignTargetPointer ===
                      (foreignPointerTypedArrayProto === undefined
                          ? (foreignPointerTypedArrayProto =
                                getTransferablePointer(TypedArrayProto))
                          : foreignPointerTypedArrayProto) ||
                  foreignTargetPointer ===
                      (foreignPointerBigInt64ArrayProto === undefined
                          ? (foreignPointerBigInt64ArrayProto = BigInt64ArrayProto
                                ? getTransferablePointer(BigInt64ArrayProto)
                                : noop)
                          : foreignPointerBigInt64ArrayProto) ||
                  foreignTargetPointer ===
                      (foreignPointerBigUint64ArrayProto === undefined
                          ? (foreignPointerBigUint64ArrayProto = BigUint64ArrayProto
                                ? getTransferablePointer(BigUint64ArrayProto)
                                : noop)
                          : foreignPointerBigUint64ArrayProto)
            : alwaysFalse;

        function getTransferablePointer(
            originalTarget: ProxyTarget,
            foreignCallablePusher = foreignCallablePushTarget
        ): Pointer {
            let proxyPointer = proxyPointerCache.get(originalTarget);
            if (proxyPointer) {
                return proxyPointer;
            }
            let targetFunctionArity = 0;
            let targetFunctionName = '';
            let targetTypedArrayLength = 0;
            if (revokedProxyCallback && revokedProxyCallback(originalTarget)) {
                proxyPointer = foreignCallablePusher(
                    createPointer(originalTarget),
                    TargetTraits.Revoked,
                    targetFunctionArity,
                    targetFunctionName,
                    targetTypedArrayLength
                );
                proxyPointerCache.set(originalTarget, proxyPointer);
                return proxyPointer;
            }
            let distortionTarget: ProxyTarget;
            let targetTraits = TargetTraits.IsObject;
            if (distortionCallback) {
                distortionTarget = distortionCallback(originalTarget);
                // If a distortion entry is found, it must be a valid proxy target.
                if (
                    distortionTarget !== originalTarget &&
                    typeof distortionTarget !== typeof originalTarget
                ) {
                    throw new TypeErrorCtor(
                        `Invalid distortion ${toSafeTemplateStringValue(originalTarget)}.`
                    );
                }
            } else {
                distortionTarget = originalTarget;
            }
            let isPossiblyRevoked = true;
            if (typeof distortionTarget === 'function') {
                isPossiblyRevoked = false;
                targetFunctionArity = 0;
                targetTraits = TargetTraits.IsFunction;
                try {
                    // Detect arrow functions.
                    if (!('prototype' in distortionTarget)) {
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
                } catch {
                    isPossiblyRevoked = true;
                }
            } else if (ArrayBufferIsView(distortionTarget)) {
                isPossiblyRevoked = false;
                targetTraits = TargetTraits.IsArrayBufferView;
                try {
                    targetTypedArrayLength = ReflectApply(
                        TypedArrayProtoLengthGetter,
                        distortionTarget,
                        []
                    ) as number;
                    targetTraits |= TargetTraits.IsTypedArray;
                    // eslint-disable-next-line no-empty
                } catch {
                    // Could be a DataView object or a revoked proxy.
                    isPossiblyRevoked = true;
                }
            }
            if (isPossiblyRevoked) {
                try {
                    if (isArrayOrThrowForRevoked(distortionTarget)) {
                        targetTraits = TargetTraits.IsArray;
                    }
                } catch {
                    targetTraits = TargetTraits.Revoked;
                }
            }
            proxyPointer = foreignCallablePusher(
                createPointer(distortionTarget),
                targetTraits,
                targetFunctionArity,
                targetFunctionName,
                targetTypedArrayLength
            );
            proxyPointerCache.set(originalTarget, proxyPointer);
            return proxyPointer;
        }

        const installPropertyDescriptorMethodWrappers = IS_IN_SHADOW_REALM
            ? (unforgeableGlobalThisKeys?: PropertyKey[]) => {
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
                      ? ({ __proto__: null } as unknown as Record<PropertyKey, GlobalThisGetter>)
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
                                      // eslint-disable-next-line @typescript-eslint/no-use-before-define
                                      get: getUnforgeableGlobalThisGetter!(key),
                                      set: undefined,
                                  }
                                : ReflectGetOwnPropertyDescriptor(target, key)
                      : undefined;

                  const getUnforgeableGlobalThisGetter = shouldFixChromeBug
                      ? (key: PropertyKey): GlobalThisGetter => {
                            let globalThisGetter: GlobalThisGetter | undefined =
                                keyToGlobalThisGetterRegistry![key];
                            if (globalThisGetter === undefined) {
                                // We can't access the original getter to mask
                                // with `proxyMaskFunction()`, so instead we wrap
                                // `unboundGlobalThisGetter` in bound function
                                // to obscure the getter source as "[native code]".
                                globalThisGetter = ReflectApply(
                                    FunctionProtoBind,
                                    // eslint-disable-next-line @typescript-eslint/no-use-before-define
                                    unboundGlobalThisGetter,
                                    []
                                ) as GlobalThisGetter;
                                // Preserve identity continuity of getters.
                                keyToGlobalThisGetterRegistry![key] = globalThisGetter;
                            }
                            return globalThisGetter;
                        }
                      : undefined;

                  const lookupFixedGetter = shouldFixChromeBug
                      ? (target: any, key: PropertyKey): Getter | undefined =>
                            ReflectApply(ArrayProtoIncludes, unforgeableGlobalThisKeys, [key])
                                ? getUnforgeableGlobalThisGetter!(key)
                                : ReflectApply(ObjectProtoLookupGetter, target, [key])
                      : undefined;

                  const lookupFixedSetter = shouldFixChromeBug
                      ? (target: any, key: PropertyKey): Setter | undefined =>
                            ReflectApply(ArrayProtoIncludes, unforgeableGlobalThisKeys, [key])
                                ? undefined
                                : ReflectApply(ObjectProtoLookupSetter, target, [key])
                      : undefined;

                  const unboundGlobalThisGetter = shouldFixChromeBug
                      ? ((() => globalThisRef) as GlobalThisGetter)
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
                                      if ((state as any)?.[key]) {
                                          // Activate the descriptor by triggering
                                          // its getter.
                                          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                                          target[key];
                                      }
                                  }
                              }
                              return ReflectApply(originalFunc, thisArg, args);
                          },
                      });
                  };

                  const wrapLookupAccessor = (
                      originalFunc: typeof ObjectProtoLookupGetter,
                      lookupFixedAccessor?: typeof lookupFixedGetter | typeof lookupFixedSetter
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
                                  if ((state as any)?.[key]) {
                                      // Activate the descriptor by triggering
                                      // its getter.
                                      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                                      thisArg[key];
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
                                      if ((state as any)?.[key]) {
                                          // Activate the descriptor by triggering
                                          // its getter.
                                          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                                          (target as any)[key];
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
                              const unsafeDescs: PropertyDescriptorMap = isFixingChromeBug
                                  ? // Create an empty property descriptor map
                                    // to populate with curated descriptors.
                                    {}
                                  : // Since this is not a global object it is
                                    // safe to use the native method.
                                    ReflectApply(originalFunc, thisArg, args);
                              if (!isFixingChromeBug && state === undefined) {
                                  // Exit early if the target is not a global
                                  // object and there are no lazy descriptors.
                                  return unsafeDescs;
                              }
                              const ownKeys = ReflectOwnKeys(
                                  isFixingChromeBug ? target : unsafeDescs
                              );
                              for (let i = 0, { length } = ownKeys; i < length; i += 1) {
                                  const ownKey = ownKeys[i];
                                  const isLazyProp = !!(state as any)?.[ownKey];
                                  if (isLazyProp) {
                                      // Activate the descriptor by triggering
                                      // its getter.
                                      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                                      (target as any)[ownKey];
                                  }
                                  if (isLazyProp || isFixingChromeBug) {
                                      const unsafeDesc = isFixingChromeBug
                                          ? getFixedDescriptor!(target, ownKey)
                                          : ReflectGetOwnPropertyDescriptor(target, ownKey);
                                      // Update the descriptor map entry.
                                      if (unsafeDesc) {
                                          unsafeDescs[ownKey] = unsafeDesc;
                                      } else if (!isFixingChromeBug) {
                                          ReflectDeleteProperty(unsafeDescs, ownKey);
                                      }
                                  }
                              }
                              return unsafeDescs;
                          },
                      }) as typeof Object.getOwnPropertyDescriptors;
                  try {
                      ReflectRef.defineProperty = wrapDefineAccessOrProperty(
                          ReflectDefineProperty
                      ) as typeof Reflect.defineProperty;
                      // eslint-disable-next-line no-empty
                  } catch {}
                  try {
                      ReflectRef.getOwnPropertyDescriptor = wrapGetOwnPropertyDescriptor(
                          ReflectGetOwnPropertyDescriptor
                      );
                      // eslint-disable-next-line no-empty
                  } catch {}
                  try {
                      ObjectCtor.getOwnPropertyDescriptor = wrapGetOwnPropertyDescriptor(
                          ObjectGetOwnPropertyDescriptor
                      );
                      // eslint-disable-next-line no-empty
                  } catch {}
                  try {
                      ObjectCtor.getOwnPropertyDescriptors = wrapGetOwnPropertyDescriptors(
                          ObjectGetOwnPropertyDescriptors
                      );
                      // eslint-disable-next-line no-empty
                  } catch {}
                  try {
                      // eslint-disable-next-line @typescript-eslint/naming-convention, no-restricted-properties, no-underscore-dangle
                      (ObjectProto as any).__defineGetter__ =
                          wrapDefineAccessOrProperty(ObjectProtoDefineGetter);
                      // eslint-disable-next-line no-empty
                  } catch {}
                  try {
                      // eslint-disable-next-line @typescript-eslint/naming-convention, no-restricted-properties, no-underscore-dangle
                      (ObjectProto as any).__defineSetter__ =
                          wrapDefineAccessOrProperty(ObjectProtoDefineSetter);
                      // eslint-disable-next-line no-empty
                  } catch {}
                  try {
                      // eslint-disable-next-line @typescript-eslint/naming-convention, no-underscore-dangle
                      (ObjectProto as any).__lookupGetter__ = wrapLookupAccessor(
                          ObjectProtoLookupGetter,
                          lookupFixedGetter
                      );
                      // eslint-disable-next-line no-empty
                  } catch {}
                  try {
                      // eslint-disable-next-line @typescript-eslint/naming-convention, no-underscore-dangle
                      (ObjectProto as any).__lookupSetter__ = wrapLookupAccessor(
                          ObjectProtoLookupSetter,
                          lookupFixedSetter
                      );
                      // eslint-disable-next-line no-empty
                  } catch {}
              }
            : noop;

        function lookupForeignDescriptor(
            foreignTargetPointer: Pointer,
            shadowTarget: ShadowTarget,
            key: PropertyKey
        ): ForeignPropertyDescriptor | undefined {
            let protoPointerOrNull;
            let safeDesc: ForeignPropertyDescriptor | undefined;
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
                            valuePointerOrPrimitive,
                            getterPointerOrPrimitive,
                            setterPointerOrPrimitive
                        ) => {
                            safeDesc = {
                                __proto__: null,
                                foreign: true,
                            } as PropertyDescriptor;
                            if (configurable !== LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL) {
                                safeDesc.configurable = configurable as boolean;
                            }
                            if (enumerable !== LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL) {
                                safeDesc.enumerable = enumerable as boolean;
                            }
                            if (writable !== LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL) {
                                safeDesc.writable = writable as boolean;
                            }
                            if (
                                getterPointerOrPrimitive !==
                                LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL
                            ) {
                                if (typeof getterPointerOrPrimitive === 'function') {
                                    getterPointerOrPrimitive();
                                    safeDesc.get = selectedTarget as Getter;
                                    selectedTarget = undefined;
                                } else {
                                    safeDesc.get = undefined;
                                }
                            }
                            if (
                                setterPointerOrPrimitive !==
                                LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL
                            ) {
                                if (typeof setterPointerOrPrimitive === 'function') {
                                    setterPointerOrPrimitive();
                                    safeDesc.set = selectedTarget as Setter;
                                    selectedTarget = undefined;
                                } else {
                                    safeDesc.set = undefined;
                                }
                            }
                            if (
                                valuePointerOrPrimitive !==
                                LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL
                            ) {
                                if (typeof valuePointerOrPrimitive === 'function') {
                                    valuePointerOrPrimitive();
                                    safeDesc.value = selectedTarget;
                                    selectedTarget = undefined;
                                } else {
                                    safeDesc.value = valuePointerOrPrimitive;
                                }
                            }
                            if (configurable === false) {
                                // Update the descriptor to non-configurable on
                                // the shadow target.
                                ReflectDefineProperty(shadowTarget, key, safeDesc);
                            }
                        }
                    );
            } catch (error: any) {
                const errorToThrow = selectedTarget ?? error;
                selectedTarget = undefined;
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
                    currentObject = null;
                }
                while (currentObject) {
                    safeDesc = ReflectGetOwnPropertyDescriptor(currentObject, key);
                    if (safeDesc) {
                        ReflectSetPrototypeOf(safeDesc, null);
                        break;
                    }
                    currentObject = ReflectGetPrototypeOf(currentObject);
                }
                if (safeDesc) {
                    const { get: getter, set: setter, value: localValue } = safeDesc;
                    const possibleProxy = getter ?? setter ?? localValue;
                    safeDesc.foreign =
                        ((typeof possibleProxy === 'object' && possibleProxy !== null) ||
                            typeof possibleProxy === 'function') &&
                        proxyPointerCache.get(possibleProxy) !== undefined;
                }
            }
            return safeDesc;
        }

        function passthruForeignTraversedSet(
            foreignTargetPointer: Pointer,
            shadowTarget: ShadowTarget,
            key: PropertyKey,
            value: any,
            receiver: any
        ): boolean {
            const safeDesc = lookupForeignDescriptor(foreignTargetPointer, shadowTarget, key);
            // Following the specification steps for
            // OrdinarySetWithOwnDescriptor ( O, P, V, Receiver, ownDesc ).
            // https://tc39.es/ecma262/#sec-ordinarysetwithowndescriptor
            if (safeDesc) {
                if ('get' in safeDesc || 'set' in safeDesc) {
                    const { set: setter } = safeDesc;
                    if (setter) {
                        if (safeDesc.foreign) {
                            foreignCallableApply(
                                getTransferablePointer(setter),
                                // Inline getTransferableValue().
                                (typeof receiver === 'object' && receiver !== null) ||
                                    typeof receiver === 'function'
                                    ? getTransferablePointer(receiver)
                                    : // Intentionally ignoring `document.all`.
                                    // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                                    // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                                    typeof receiver === 'undefined'
                                    ? undefined
                                    : receiver,
                                // Inline getTransferableValue().
                                (typeof value === 'object' && value !== null) ||
                                    typeof value === 'function'
                                    ? getTransferablePointer(value)
                                    : // Intentionally ignoring `document.all`.
                                    // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                                    // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                                    typeof value === 'undefined'
                                    ? undefined
                                    : value
                            );
                        } else {
                            // Even though the setter function exists, we can't
                            // use `ReflectSet()` because there might be a
                            // distortion for that setter function, in which
                            // case we must resolve the local setter and call
                            // it instead.
                            ReflectApply(setter, receiver, [value]);
                        }
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
            // Exit early if receiver is not object like.
            if (
                !(
                    (typeof receiver === 'object' && receiver !== null) ||
                    typeof receiver === 'function'
                )
            ) {
                return false;
            }
            const safeReceiverDesc = ReflectGetOwnPropertyDescriptor(receiver, key);
            if (safeReceiverDesc) {
                ReflectSetPrototypeOf(safeReceiverDesc, null);
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
                    __proto__: null,
                    value,
                } as PropertyDescriptor);
                return true;
            }
            // `ReflectDefineProperty()` and `ReflectSet()` both are expected
            // to return `false` when attempting to add a new property if the
            // receiver is not extensible.
            return ReflectDefineProperty(receiver, key, {
                __proto__: null,
                configurable: true,
                enumerable: true,
                value,
                writable: true,
            } as PropertyDescriptor);
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
            foreignTargetFunctionArity: number,
            foreignTargetFunctionName: string,
            foreignTargetTypedArrayLength: number
        ): Pointer {
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            const { proxy } = new BoundaryProxyHandler(
                foreignTargetPointer,
                foreignTargetTraits,
                foreignTargetFunctionArity,
                foreignTargetFunctionName,
                foreignTargetTypedArrayLength
            );
            proxyPointerCache.set(proxy, foreignTargetPointer);
            return createPointer(proxy);
        }

        const setLazyPropertyDescriptorStateByTarget = IS_IN_SHADOW_REALM
            ? (target: ProxyTarget, state: object) => {
                  lazyPropertyDescriptorStateCache.set(target, state);
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

            private serialize: () => Primitive;

            private staticToStringTag: string;

            // The membrane color help developers identify which side of the
            // membrane they are debugging.
            // @ts-ignore: Prevent 'has no initializer and is not definitely assigned in the constructor' error.
            private readonly color: string;

            private readonly foreignTargetPointer: Pointer;

            private readonly foreignTargetTraits: TargetTraits;

            private readonly foreignTargetTypedArrayLength: number;

            private readonly nonConfigurableDescriptorCallback: CallableNonConfigurableDescriptorCallback;

            readonly proxy: ShadowTarget;

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
            private readonly applyTrapForFiveOrMoreArgs: ProxyHandler<ShadowTarget>['apply'];

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
            private readonly constructTrapForFiveOrMoreArgs: ProxyHandler<ShadowTarget>['construct'];

            // @ts-ignore: Prevent 'is declared but its value is never read' error.
            private readonly constructTrapForAnyNumberOfArgs: ProxyHandler<ShadowTarget>['construct'];

            constructor(
                foreignTargetPointer: Pointer,
                foreignTargetTraits: TargetTraits,
                foreignTargetFunctionArity: number,
                foreignTargetFunctionName: string,
                foreignTargetTypedArrayLength: number
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
                    if (DEV_MODE && foreignTargetFunctionName.length) {
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
                this.foreignTargetTypedArrayLength = foreignTargetTypedArrayLength;
                // Define in the BoundaryProxyHandler constructor so it is bound
                // to the BoundaryProxyHandler instance.
                this.nonConfigurableDescriptorCallback = (
                    key,
                    configurable,
                    enumerable,
                    writable,
                    valuePointer,
                    getterPointer,
                    setterPointer
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
                            getterPointer,
                            setterPointer
                        )
                    );
                };
                this.proxy = proxy;
                this.revoke = revoke;
                this.serialize = noop;
                this.shadowTarget = shadowTarget;
                this.staticToStringTag = 'Object';
                // Define traps.
                if (isForeignTargetFunction) {
                    this.apply = (this as any)[
                        applyTrapNameRegistry[foreignTargetFunctionArity] ?? applyTrapNameRegistry.n
                    ];
                    this.construct = (this as any)[
                        constructTrapNameRegistry[foreignTargetFunctionArity] ??
                            constructTrapNameRegistry.n
                    ];
                }
                this.defineProperty = BoundaryProxyHandler.defaultDefinePropertyTrap;
                this.deleteProperty = BoundaryProxyHandler.defaultDeletePropertyTrap;
                this.isExtensible = BoundaryProxyHandler.defaultIsExtensibleTrap;
                this.getOwnPropertyDescriptor =
                    BoundaryProxyHandler.defaultGetOwnPropertyDescriptorTrap;
                this.getPrototypeOf = BoundaryProxyHandler.defaultGetPrototypeOfTrap;
                this.get =
                    foreignTargetTraits & TargetTraits.IsTypedArray
                        ? BoundaryProxyHandler.hybridGetTrapForTypedArray
                        : BoundaryProxyHandler.defaultGetTrap;
                this.has = BoundaryProxyHandler.defaultHasTrap;
                this.ownKeys = BoundaryProxyHandler.defaultOwnKeysTrap;
                this.preventExtensions = BoundaryProxyHandler.defaultPreventExtensionsTrap;
                this.setPrototypeOf = BoundaryProxyHandler.defaultSetPrototypeOfTrap;
                this.set = BoundaryProxyHandler.defaultSetTrap;
                if (foreignTargetTraits & TargetTraits.Revoked) {
                    this.revoke();
                } else if (IS_IN_SHADOW_REALM) {
                    if (
                        isForeignTargetArray ||
                        foreignTargetTraits & TargetTraits.IsArrayBufferView
                    ) {
                        this.makeProxyLive();
                    }
                } else {
                    if (foreignTargetTraits & TargetTraits.IsObject) {
                        // Lazily define serialize method.
                        let cachedSerializedValue: SerializedValue | undefined | symbol =
                            LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                        this.serialize = () => {
                            if (
                                cachedSerializedValue ===
                                LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL
                            ) {
                                cachedSerializedValue = foreignCallableSerializeTarget(
                                    this.foreignTargetPointer
                                );
                            }
                            return cachedSerializedValue;
                        };
                    }
                }
            }

            // Internal red/shadow realm side utilities:

            private makeProxyLive = IS_IN_SHADOW_REALM
                ? function (this: BoundaryProxyHandler): void {
                      // Replace pending traps with live traps that can work with the
                      // target without taking snapshots.
                      this.deleteProperty = BoundaryProxyHandler.passthruDeletePropertyTrap;
                      this.defineProperty = BoundaryProxyHandler.passthruDefinePropertyTrap;
                      this.preventExtensions = BoundaryProxyHandler.passthruPreventExtensionsTrap;
                      this.set = BoundaryProxyHandler.passthruSetTrap;
                      this.setPrototypeOf = BoundaryProxyHandler.passthruSetPrototypeOfTrap;
                  }
                : noop;

            private makeProxyStatic = IS_IN_SHADOW_REALM
                ? function (this: BoundaryProxyHandler): void {
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

                      const { foreignTargetPointer, foreignTargetTraits, shadowTarget } = this;
                      if (useFastForeignTargetPath) {
                          fastForeignTargetPointers!.delete(foreignTargetPointer);
                      }
                      // We don't wrap `foreignCallableGetTargetIntegrityTraits()`
                      // in a try-catch because it cannot throw.
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
                          // We don't wrap `foreignCallableIsTargetRevoked()` in a
                          // try-catch because it cannot throw.
                          if (foreignCallableIsTargetRevoked(foreignTargetPointer)) {
                              this.revoke();
                              return;
                          }
                      }
                      if (
                          foreignTargetTraits & TargetTraits.IsObject &&
                          !(SymbolToStringTag in shadowTarget)
                      ) {
                          let toStringTag = 'Object';
                          try {
                              toStringTag =
                                  foreignCallableGetToStringTagOfTarget(foreignTargetPointer);
                              // eslint-disable-next-line no-empty
                          } catch {}
                          this.staticToStringTag = toStringTag;
                      }
                      // Preserve the semantics of the target.
                      if (targetIntegrityTraits & TargetIntegrityTraits.IsFrozen) {
                          ObjectFreeze(shadowTarget);
                      } else {
                          if (targetIntegrityTraits & TargetIntegrityTraits.IsSealed) {
                              ObjectSeal(shadowTarget);
                          } else if (
                              targetIntegrityTraits & TargetIntegrityTraits.IsNotExtensible
                          ) {
                              ReflectPreventExtensions(shadowTarget);
                          }
                          if (LOCKER_UNMINIFIED_FLAG) {
                              // We don't wrap `foreignCallableDebugInfo()` in a try-catch
                              // because it cannot throw.
                              foreignCallableDebugInfo(
                                  'Mutations on the membrane of an object originating ' +
                                      'outside of the sandbox will not be reflected on ' +
                                      'the object itself:',
                                  foreignTargetPointer
                              );
                          }
                      }
                  }
                : noop;

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
                      const { foreignTargetPointer, foreignTargetTraits, proxy, shadowTarget } =
                          this;
                      let safeDesc: ForeignPropertyDescriptor | undefined;
                      let result: any;
                      if (
                          useFastForeignTargetPath &&
                          fastForeignTargetPointers!.has(foreignTargetPointer)
                      ) {
                          let pointerOrPrimitive: PointerOrPrimitive;
                          try {
                              pointerOrPrimitive = foreignCallableGetPropertyValue(
                                  foreignTargetPointer,
                                  key
                              );
                          } catch (error: any) {
                              const errorToThrow = selectedTarget ?? error;
                              selectedTarget = undefined;
                              throw errorToThrow;
                          }
                          if (typeof pointerOrPrimitive === 'function') {
                              pointerOrPrimitive();
                              result = selectedTarget;
                              selectedTarget = undefined;
                          } else {
                              result = pointerOrPrimitive;
                          }
                      } else {
                          safeDesc = lookupForeignDescriptor(
                              foreignTargetPointer,
                              shadowTarget,
                              key
                          );
                          if (safeDesc) {
                              const { get: getter, value: localValue } = safeDesc;
                              if (getter) {
                                  if (safeDesc.foreign) {
                                      const foreignGetterPointer = getTransferablePointer(getter);
                                      const transferableReceiver =
                                          proxy === receiver
                                              ? foreignTargetPointer
                                              : // Inline getTransferableValue().
                                              (typeof receiver === 'object' && receiver !== null) ||
                                                typeof receiver === 'function'
                                              ? getTransferablePointer(receiver)
                                              : receiver;
                                      let pointerOrPrimitive: PointerOrPrimitive;
                                      try {
                                          pointerOrPrimitive = foreignCallableApply(
                                              foreignGetterPointer,
                                              transferableReceiver
                                          );
                                      } catch (error: any) {
                                          const errorToThrow = selectedTarget ?? error;
                                          selectedTarget = undefined;
                                          throw errorToThrow;
                                      }
                                      if (typeof pointerOrPrimitive === 'function') {
                                          pointerOrPrimitive();
                                          result = selectedTarget;
                                          selectedTarget = undefined;
                                      } else {
                                          result = pointerOrPrimitive;
                                      }
                                  } else {
                                      // Even though the getter function exists,
                                      // we can't use `ReflectGet()` because there
                                      // might be a distortion for that getter function,
                                      // in which case we must resolve the local getter
                                      // and call it instead.
                                      result = ReflectApply(getter, receiver, []);
                                  }
                              } else {
                                  result = localValue;
                              }
                          } else {
                              const transferableReceiver =
                                  proxy === receiver
                                      ? foreignTargetPointer
                                      : // Inline getTransferableValue().
                                      (typeof receiver === 'object' && receiver !== null) ||
                                        typeof receiver === 'function'
                                      ? getTransferablePointer(receiver)
                                      : receiver;
                              let pointerOrPrimitive: PointerOrPrimitive;
                              try {
                                  pointerOrPrimitive = foreignCallableGet(
                                      foreignTargetPointer,
                                      foreignTargetTraits,
                                      key,
                                      transferableReceiver
                                  );
                              } catch (error: any) {
                                  const errorToThrow = selectedTarget ?? error;
                                  selectedTarget = undefined;
                                  throw errorToThrow;
                              }
                              if (typeof pointerOrPrimitive === 'function') {
                                  pointerOrPrimitive();
                                  result = selectedTarget;
                                  selectedTarget = undefined;
                              } else {
                                  result = pointerOrPrimitive;
                              }
                          }
                      }
                      if (
                          safeDesc === undefined &&
                          result === undefined &&
                          key === SymbolToStringTag &&
                          foreignTargetTraits & TargetTraits.IsObject
                      ) {
                          let toStringTag;
                          try {
                              toStringTag =
                                  foreignCallableGetToStringTagOfTarget(foreignTargetPointer);
                          } catch (error: any) {
                              const errorToThrow = selectedTarget ?? error;
                              selectedTarget = undefined;
                              throw errorToThrow;
                          }
                          // The default language toStringTag is "Object". If we
                          // receive "Object" we return `undefined` to let the
                          // language resolve it naturally without projecting a
                          // value.
                          if (toStringTag !== 'Object') {
                              result = toStringTag;
                          }
                      }
                      return result;
                  }
                : (noop as typeof Reflect.get);

            private static hybridGetTrapForTypedArray = IS_IN_SHADOW_REALM
                ? function (
                      this: BoundaryProxyHandler,
                      _shadowTarget: ShadowTarget,
                      key: PropertyKey,
                      receiver: any
                  ): ReturnType<typeof Reflect.get> {
                      const {
                          foreignTargetPointer,
                          foreignTargetTypedArrayLength,
                          proxy,
                          shadowTarget,
                      } = this;
                      let useFastPath = useFastForeignTargetPathForTypedArrays;
                      if (!useFastPath && typeof key === 'string') {
                          const possibleIndex = +key;
                          useFastPath =
                              possibleIndex > -1 &&
                              possibleIndex < foreignTargetTypedArrayLength &&
                              NumberIsInteger(possibleIndex);
                      }
                      let result: any;
                      if (useFastPath) {
                          let pointerOrPrimitive: PointerOrPrimitive;
                          try {
                              pointerOrPrimitive = foreignCallableGetPropertyValue(
                                  foreignTargetPointer,
                                  key
                              );
                          } catch (error: any) {
                              const errorToThrow = selectedTarget ?? error;
                              selectedTarget = undefined;
                              throw errorToThrow;
                          }
                          if (typeof pointerOrPrimitive === 'function') {
                              pointerOrPrimitive();
                              result = selectedTarget;
                              selectedTarget = undefined;
                          } else {
                              result = pointerOrPrimitive;
                          }
                      } else {
                          const safeDesc = lookupForeignDescriptor(
                              foreignTargetPointer,
                              shadowTarget,
                              key
                          );
                          if (safeDesc) {
                              const { get: getter, value: localValue } = safeDesc;
                              if (getter) {
                                  if (safeDesc.foreign) {
                                      const foreignGetterPointer = getTransferablePointer(getter);
                                      const transferableReceiver =
                                          proxy === receiver
                                              ? foreignTargetPointer
                                              : // Inline getTransferableValue().
                                              (typeof receiver === 'object' && receiver !== null) ||
                                                typeof receiver === 'function'
                                              ? getTransferablePointer(receiver)
                                              : receiver;
                                      let pointerOrPrimitive: PointerOrPrimitive;
                                      try {
                                          pointerOrPrimitive = foreignCallableApply(
                                              foreignGetterPointer,
                                              transferableReceiver
                                          );
                                      } catch (error: any) {
                                          const errorToThrow = selectedTarget ?? error;
                                          selectedTarget = undefined;
                                          throw errorToThrow;
                                      }
                                      if (typeof pointerOrPrimitive === 'function') {
                                          pointerOrPrimitive();
                                          result = selectedTarget;
                                          selectedTarget = undefined;
                                      } else {
                                          result = pointerOrPrimitive;
                                      }
                                  } else {
                                      // Even though the getter function exists,
                                      // we can't use `ReflectGet()` because there
                                      // might be a distortion for that getter function,
                                      // in which case we must resolve the local getter
                                      // and call it instead.
                                      result = ReflectApply(getter, receiver, []);
                                  }
                              } else {
                                  result = localValue;
                              }
                          }
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
                              currentObject = null;
                          }
                          while (currentObject) {
                              if (ObjectHasOwn(currentObject, key)) {
                                  result = true;
                                  break;
                              }
                              currentObject = ReflectGetPrototypeOf(currentObject);
                          }
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
                const { foreignTargetPointer, nonConfigurableDescriptorCallback } = this;
                const safePartialDesc = unsafePartialDesc;
                ReflectSetPrototypeOf(safePartialDesc, null);
                const { get: getter, set: setter, value } = safePartialDesc;
                const valuePointerOrPrimitive =
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
                const getterPointerOrUndefinedSymbol =
                    'get' in safePartialDesc
                        ? // Inline getTransferableValue().
                          typeof getter === 'function'
                            ? getTransferablePointer(getter)
                            : getter
                        : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                const setterPointerOrUndefinedSymbol =
                    'set' in safePartialDesc
                        ? // Inline getTransferableValue().
                          typeof setter === 'function'
                            ? getTransferablePointer(setter)
                            : setter
                        : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                let result = false;
                try {
                    result = foreignCallableDefineProperty(
                        foreignTargetPointer,
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
                        valuePointerOrPrimitive,
                        getterPointerOrUndefinedSymbol,
                        setterPointerOrUndefinedSymbol,
                        nonConfigurableDescriptorCallback
                    );
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    throw errorToThrow;
                }
                if (
                    useFastForeignTargetPath &&
                    result &&
                    (typeof getterPointerOrUndefinedSymbol === 'function' ||
                        typeof setterPointerOrUndefinedSymbol === 'function')
                ) {
                    fastForeignTargetPointers!.delete(foreignTargetPointer);
                }
                return result;
            }

            private static passthruDeletePropertyTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                key: PropertyKey
            ): ReturnType<typeof Reflect.deleteProperty> {
                lastProxyTrapCalled = ProxyHandlerTraps.DeleteProperty;
                let result = false;
                try {
                    result = foreignCallableDeleteProperty(this.foreignTargetPointer, key);
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    throw errorToThrow;
                }
                return result;
            }

            private static passthruGetTrap = IS_NOT_IN_SHADOW_REALM
                ? function (
                      this: BoundaryProxyHandler,
                      _shadowTarget: ShadowTarget,
                      key: PropertyKey,
                      receiver: any
                  ): ReturnType<typeof Reflect.get> {
                      // Only allow accessing handshake property values if the
                      // "has" trap has been triggered immediately BEFORE and
                      // the property does NOT exist.
                      handshakePropertyFlag &&= lastProxyTrapCalled === ProxyHandlerTraps.Has;
                      lastProxyTrapCalled = ProxyHandlerTraps.Get;
                      const isNearMembraneSymbol = key === LOCKER_NEAR_MEMBRANE_SYMBOL;
                      const isNearMembraneSerializedValueSymbol =
                          key === LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL;
                      if (handshakePropertyFlag) {
                          // Exit without performing a [[Get]] for handshake
                          // properties because we know that when the
                          // `handshakePropertyFlag` is ON that there are NO
                          // shadowed values.
                          if (isNearMembraneSymbol) {
                              return true;
                          }
                          if (isNearMembraneSerializedValueSymbol) {
                              return this.serialize();
                          }
                      }
                      const { foreignTargetPointer, foreignTargetTraits, proxy } = this;
                      if (typeof receiver === 'undefined') {
                          receiver = proxy;
                      }
                      const transferableReceiver =
                          proxy === receiver
                              ? LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL
                              : // Inline getTransferableValue().
                              (typeof receiver === 'object' && receiver !== null) ||
                                typeof receiver === 'function'
                              ? getTransferablePointer(receiver)
                              : receiver;
                      let pointerOrPrimitive: PointerOrPrimitive;
                      try {
                          pointerOrPrimitive = foreignCallableGet(
                              foreignTargetPointer,
                              foreignTargetTraits,
                              key,
                              transferableReceiver
                          );
                      } catch (error: any) {
                          const errorToThrow = selectedTarget ?? error;
                          selectedTarget = undefined;
                          throw errorToThrow;
                      }
                      let result: any;
                      if (typeof pointerOrPrimitive === 'function') {
                          pointerOrPrimitive();
                          result = selectedTarget;
                          selectedTarget = undefined;
                      } else {
                          result = pointerOrPrimitive;
                      }
                      // Getting forged values of handshake properties is not allowed.
                      if (
                          result !== undefined &&
                          (isNearMembraneSymbol || isNearMembraneSerializedValueSymbol)
                      ) {
                          throw new TypeErrorCtor(ERR_ILLEGAL_PROPERTY_ACCESS);
                      }
                      return result;
                  }
                : (noop as typeof Reflect.get);

            private static passthruGetPrototypeOfTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget
            ): ReturnType<typeof Reflect.getPrototypeOf> {
                lastProxyTrapCalled = ProxyHandlerTraps.GetPrototypeOf;
                let protoPointerOrNull;
                try {
                    protoPointerOrNull = foreignCallableGetPrototypeOf(this.foreignTargetPointer);
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
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
                return proto as object | null;
            }

            private static passthruHasTrap = IS_NOT_IN_SHADOW_REALM
                ? function (
                      this: BoundaryProxyHandler,
                      _shadowTarget: ShadowTarget,
                      key: PropertyKey
                  ): ReturnType<typeof Reflect.has> {
                      lastProxyTrapCalled = ProxyHandlerTraps.Has;
                      let result;
                      try {
                          result = foreignCallableHas(this.foreignTargetPointer, key);
                      } catch (error: any) {
                          const errorToThrow = selectedTarget ?? error;
                          selectedTarget = undefined;
                          throw errorToThrow;
                      }
                      const isNearMembraneSymbol = key === LOCKER_NEAR_MEMBRANE_SYMBOL;
                      const isNearMembraneSerializedValueSymbol =
                          key === LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL;
                      if (result) {
                          handshakePropertyFlag = false;
                          // Checking the existence of forged handshake properties
                          // is not allowed.
                          if (isNearMembraneSymbol || isNearMembraneSerializedValueSymbol) {
                              throw new TypeErrorCtor(ERR_ILLEGAL_PROPERTY_ACCESS);
                          }
                      } else {
                          // The `handshakePropertyFlag` is ON if the handshake
                          // property does NOT exist on the object or its [[Prototype]].
                          handshakePropertyFlag =
                              isNearMembraneSymbol || isNearMembraneSerializedValueSymbol;
                      }
                      return result;
                  }
                : (alwaysFalse as typeof Reflect.has);

            private static passthruIsExtensibleTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget
            ): ReturnType<typeof Reflect.isExtensible> {
                lastProxyTrapCalled = ProxyHandlerTraps.IsExtensible;
                const { shadowTarget } = this;
                let result = false;
                // Check if already locked.
                if (ReflectIsExtensible(shadowTarget)) {
                    const { foreignTargetPointer } = this;
                    try {
                        result = foreignCallableIsExtensible(foreignTargetPointer);
                    } catch (error: any) {
                        const errorToThrow = selectedTarget ?? error;
                        selectedTarget = undefined;
                        throw errorToThrow;
                    }
                    if (!result) {
                        copyForeignOwnPropertyDescriptorsAndPrototypeToShadowTarget(
                            foreignTargetPointer,
                            shadowTarget
                        );
                        ReflectPreventExtensions(shadowTarget);
                    }
                }
                return result;
            }

            private static passthruOwnKeysTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget
            ): ReturnType<typeof Reflect.ownKeys> {
                lastProxyTrapCalled = ProxyHandlerTraps.OwnKeys;
                let ownKeys: ReturnType<typeof Reflect.ownKeys> | undefined;
                try {
                    foreignCallableOwnKeys(this.foreignTargetPointer, (...args) => {
                        ownKeys = args;
                    });
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    throw errorToThrow;
                }
                return ownKeys || [];
            }

            private static passthruGetOwnPropertyDescriptorTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                key: PropertyKey
            ): ReturnType<typeof Reflect.getOwnPropertyDescriptor> {
                lastProxyTrapCalled = ProxyHandlerTraps.GetOwnPropertyDescriptor;
                const { foreignTargetPointer, shadowTarget } = this;
                let safeDesc: PropertyDescriptor | undefined;
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
                            getterPointer,
                            setterPointer
                        ) => {
                            safeDesc = createDescriptorFromMeta(
                                configurable,
                                enumerable,
                                writable,
                                valuePointer,
                                getterPointer,
                                setterPointer
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
                    throw errorToThrow;
                }
                // Getting forged descriptors of handshake properties is not allowed.
                if (
                    IS_NOT_IN_SHADOW_REALM &&
                    safeDesc &&
                    (key === LOCKER_NEAR_MEMBRANE_SYMBOL ||
                        key === LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL)
                ) {
                    throw new TypeErrorCtor(ERR_ILLEGAL_PROPERTY_ACCESS);
                }
                return safeDesc;
            }

            private static passthruPreventExtensionsTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget
            ): ReturnType<typeof Reflect.preventExtensions> {
                lastProxyTrapCalled = ProxyHandlerTraps.PreventExtensions;
                const { foreignTargetPointer, shadowTarget } = this;
                let result = true;
                if (ReflectIsExtensible(shadowTarget)) {
                    let resultEnum = PreventExtensionsResult.None;
                    try {
                        resultEnum = foreignCallablePreventExtensions(foreignTargetPointer);
                    } catch (error: any) {
                        const errorToThrow = selectedTarget ?? error;
                        selectedTarget = undefined;
                        throw errorToThrow;
                    }
                    // If the target is a proxy it might reject the
                    // preventExtension call, in which case we should not
                    // attempt to lock down the shadow target.
                    if (!(resultEnum & PreventExtensionsResult.Extensible)) {
                        copyForeignOwnPropertyDescriptorsAndPrototypeToShadowTarget(
                            foreignTargetPointer,
                            shadowTarget
                        );
                        ReflectPreventExtensions(shadowTarget);
                    }
                    result = !(resultEnum & PreventExtensionsResult.False);
                }
                return result;
            }

            private static passthruSetPrototypeOfTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                proto: object | null
            ): ReturnType<typeof Reflect.setPrototypeOf> {
                lastProxyTrapCalled = ProxyHandlerTraps.SetPrototypeOf;
                const { foreignTargetPointer } = this;
                const transferableProto = proto ? getTransferablePointer(proto) : proto;
                let result = false;
                try {
                    result = foreignCallableSetPrototypeOf(foreignTargetPointer, transferableProto);
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    throw errorToThrow;
                }
                if (useFastForeignTargetPath && result) {
                    fastForeignTargetPointers!.delete(foreignTargetPointer);
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
                const { foreignTargetPointer, proxy, shadowTarget } = this;
                // Intentionally ignoring `document.all`.
                // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                if (typeof value === 'undefined') {
                    value = undefined;
                }
                if (typeof receiver === 'undefined') {
                    receiver = proxy;
                }
                // Setting forged values of handshake properties is not allowed.
                if (
                    IS_NOT_IN_SHADOW_REALM &&
                    (key === LOCKER_NEAR_MEMBRANE_SYMBOL ||
                        key === LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL)
                ) {
                    throw new TypeErrorCtor(ERR_ILLEGAL_PROPERTY_ACCESS);
                }
                const isFastPath = proxy === receiver;
                let result = false;
                try {
                    result = isFastPath
                        ? foreignCallableSet(
                              foreignTargetPointer,
                              key,
                              // Inline getTransferableValue().
                              (typeof value === 'object' && value !== null) ||
                                  typeof value === 'function'
                                  ? getTransferablePointer(value)
                                  : value
                          )
                        : passthruForeignTraversedSet(
                              foreignTargetPointer,
                              shadowTarget,
                              key,
                              value,
                              receiver
                          );
                } catch (error: any) {
                    const errorToThrow = selectedTarget ?? error;
                    selectedTarget = undefined;
                    throw errorToThrow;
                }
                return result;
            }

            // Pending traps:

            private static pendingDefinePropertyTrap = IS_IN_SHADOW_REALM
                ? function (
                      this: BoundaryProxyHandler,
                      shadowTarget: ShadowTarget,
                      key: PropertyKey,
                      unsafePartialDesc: PropertyDescriptor
                  ): ReturnType<typeof Reflect.defineProperty> {
                      const { foreignTargetPointer, foreignTargetTraits } = this;
                      // We don't wrap `foreignCallableIsTargetLive()` in a
                      // try-catch because it cannot throw.
                      if (foreignCallableIsTargetLive(foreignTargetPointer, foreignTargetTraits)) {
                          this.makeProxyLive();
                      } else {
                          if (useFastForeignTargetPath) {
                              if (isForeignPointerOfObjectProto(foreignTargetPointer)) {
                                  disableFastForeignTargetPointers();
                              } else if (isForeignPointerOfTypedArrayProto(foreignTargetPointer)) {
                                  useFastForeignTargetPathForTypedArrays = false;
                              }
                          }
                          this.makeProxyStatic();
                      }
                      return this.defineProperty!(
                          shadowTarget,
                          key as string | symbol,
                          unsafePartialDesc
                      );
                  }
                : (alwaysFalse as typeof Reflect.defineProperty);

            private static pendingDeletePropertyTrap = IS_IN_SHADOW_REALM
                ? function (
                      this: BoundaryProxyHandler,
                      shadowTarget: ShadowTarget,
                      key: PropertyKey
                  ): ReturnType<typeof Reflect.deleteProperty> {
                      // We don't wrap `foreignCallableIsTargetLive()` in a
                      // try-catch because it cannot throw.
                      if (
                          foreignCallableIsTargetLive(
                              this.foreignTargetPointer,
                              this.foreignTargetTraits
                          )
                      ) {
                          this.makeProxyLive();
                      } else {
                          this.makeProxyStatic();
                      }
                      return this.deleteProperty!(shadowTarget, key as string | symbol);
                  }
                : (alwaysFalse as typeof Reflect.deleteProperty);

            private static pendingPreventExtensionsTrap = IS_IN_SHADOW_REALM
                ? function (
                      this: BoundaryProxyHandler,
                      shadowTarget: ShadowTarget
                  ): ReturnType<typeof Reflect.preventExtensions> {
                      // We don't wrap `foreignCallableIsTargetLive()` in a
                      // try-catch because it cannot throw.
                      if (
                          foreignCallableIsTargetLive(
                              this.foreignTargetPointer,
                              this.foreignTargetTraits
                          )
                      ) {
                          this.makeProxyLive();
                      } else {
                          this.makeProxyStatic();
                      }
                      return this.preventExtensions!(shadowTarget);
                  }
                : (alwaysFalse as typeof Reflect.preventExtensions);

            private static pendingSetPrototypeOfTrap = IS_IN_SHADOW_REALM
                ? function (
                      this: BoundaryProxyHandler,
                      shadowTarget: ShadowTarget,
                      proto: object | null
                  ): ReturnType<typeof Reflect.setPrototypeOf> {
                      const { foreignTargetPointer, foreignTargetTraits } = this;
                      // We don't wrap `foreignCallableIsTargetLive()` in a
                      // try-catch because it cannot throw.
                      if (foreignCallableIsTargetLive(foreignTargetPointer, foreignTargetTraits)) {
                          this.makeProxyLive();
                      } else {
                          if (useFastForeignTargetPath) {
                              if (isForeignPointerOfObjectProto(foreignTargetPointer)) {
                                  disableFastForeignTargetPointers();
                              } else if (isForeignPointerOfTypedArrayProto(foreignTargetPointer)) {
                                  useFastForeignTargetPathForTypedArrays = false;
                              }
                          }
                          this.makeProxyStatic();
                      }
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
                      const { foreignTargetPointer, foreignTargetTraits } = this;
                      // We don't wrap `foreignCallableIsTargetLive()` in a
                      // try-catch because it cannot throw.
                      if (foreignCallableIsTargetLive(foreignTargetPointer, foreignTargetTraits)) {
                          this.makeProxyLive();
                      } else {
                          if (useFastForeignTargetPath) {
                              if (isForeignPointerOfObjectProto(foreignTargetPointer)) {
                                  disableFastForeignTargetPointers();
                              } else if (isForeignPointerOfTypedArrayProto(foreignTargetPointer)) {
                                  useFastForeignTargetPathForTypedArrays = false;
                              }
                          }
                          this.makeProxyStatic();
                      }
                      return this.set!(shadowTarget, key as string | symbol, value, receiver);
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
                      const { foreignTargetTraits, staticToStringTag } = this;
                      const result = ReflectGet(shadowTarget, key, receiver);
                      if (
                          result === undefined &&
                          key === SymbolToStringTag &&
                          foreignTargetTraits & TargetTraits.IsObject &&
                          // The default language toStringTag is "Object". If we
                          // receive "Object" we return `undefined` to let the
                          // language resolve it naturally without projecting a
                          // value.
                          staticToStringTag !== 'Object' &&
                          !(key in shadowTarget)
                      ) {
                          return staticToStringTag;
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

        if (IS_IN_SHADOW_REALM) {
            // Initialize `fastForeignTargetPointers` weak map.
            clearFastForeignTargetPointers();
        }
        // Export callable hooks to a foreign realm.
        foreignCallableHooksCallback(
            // globalThisPointer
            // When crossing, should be mapped to the foreign globalThis
            createPointer(globalThisRef),
            // getSelectedTarget
            IS_NOT_IN_SHADOW_REALM
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
                const value = (target as any)?.[key];
                // Intentionally ignoring `document.all`.
                // https://developer.mozilla.org/en-US/docs/Web/API/Document/all
                // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
                return createPointer(typeof value === 'undefined' ? undefined : value);
            },
            // callableEvaluate
            IS_IN_SHADOW_REALM
                ? (sourceText: string): PointerOrPrimitive => {
                      let result: PointerOrPrimitive;
                      try {
                          result = localEval!(sourceText);
                      } catch (error: any) {
                          throw pushErrorAcrossBoundary(error);
                      }
                      // Inline getTransferableValue().
                      return (typeof result === 'object' && result !== null) ||
                          typeof result === 'function'
                          ? getTransferablePointer(result)
                          : result;
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
                    proxyPointerCache.set(target, newPointer);
                }
            },
            // callablePushErrorTarget
            LOCKER_DEBUGGABLE_FLAG
                ? (
                      foreignTargetPointer: () => void,
                      foreignTargetTraits: TargetTraits,
                      foreignTargetFunctionArity: number,
                      foreignTargetFunctionName: string,
                      foreignTargetTypedArrayLength: number
                  ): Pointer => {
                      const pointer = pushTarget(
                          foreignTargetPointer,
                          foreignTargetTraits,
                          foreignTargetFunctionArity,
                          foreignTargetFunctionName,
                          foreignTargetTypedArrayLength
                      );
                      const pointerWrapper = () => {
                          checkDebugMode();
                          return pointer();
                      };
                      if (DEV_MODE) {
                          pointerWrapper['[[OriginalTarget]]'] = (pointer as any)[
                              '[[OriginalTarget]]'
                          ];
                          pointerWrapper['[[Color]]'] = (pointer as any)['[[Color]]'];
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
                let result: any;
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
                getterPointer: PointerOrPrimitive,
                setterPointer: PointerOrPrimitive,
                foreignCallableNonConfigurableDescriptorCallback: CallableDescriptorCallback
            ): boolean => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                const safePartialDesc = createDescriptorFromMeta(
                    configurable,
                    enumerable,
                    writable,
                    valuePointer,
                    getterPointer,
                    setterPointer
                );
                let result = false;
                try {
                    result = ReflectDefineProperty(target, key, safePartialDesc);
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
                            const { get: getter, set: setter, value } = safeDesc;
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
                                      typeof getter === 'function'
                                        ? getTransferablePointer(getter)
                                        : getter
                                    : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL,
                                'set' in safeDesc
                                    ? // Inline getTransferableValue().
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
                    receiver =
                        receiverPointerOrPrimitive === LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL
                            ? target
                            : receiverPointerOrPrimitive;
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
                    key === SymbolToStringTag &&
                    targetTraits & TargetTraits.IsObject
                ) {
                    try {
                        if (!(key in target)) {
                            // Section 19.1.3.6 Object.prototype.toString()
                            // https://tc39.github.io/ecma262/#sec-object.prototype.tostring
                            const brand: string = ReflectApply(ObjectProtoToString, target, []);
                            // The default language toStringTag is "Object". If
                            // we receive "[object Object]" we return `undefined`
                            // to let the language resolve it naturally without
                            // projecting a value.
                            if (brand !== '[object Object]') {
                                result = ReflectApply(StringProtoSlice, brand, [8, -1]) as string;
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
                    const { get: getter, set: setter, value } = safeDesc;
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
                              typeof getter === 'function'
                                ? getTransferablePointer(getter)
                                : getter
                            : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL,
                        'set' in safeDesc
                            ? // Inline getTransferableValue().
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
                let proto: object | null;
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
                    return key in target;
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
                    } else if (ReflectIsExtensible(target)) {
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
                valuePointerOrPrimitive: PointerOrPrimitive
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
                try {
                    return ReflectSet(target, key, value, target);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
            },
            // callableSetPrototypeOf
            (targetPointer: Pointer, protoPointerOrNull: Pointer | null = null): boolean => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                let proto: object | null;
                if (typeof protoPointerOrNull === 'function') {
                    // Instead of calling `protoPointerOrNull()` directly we use
                    // `ReflectApply` to avoid a Maglev (https://v8.dev/blog/maglev)
                    // optimizing JIT bug in Chrome >= 117:
                    // https://bugs.chromium.org/p/chromium/issues/detail?id=1494060
                    ReflectApply(protoPointerOrNull, undefined, []);
                    proto = selectedTarget!;
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
                                  descriptorTuples[i + 5] as PointerOrPrimitive, // getterPointer
                                  descriptorTuples[i + 6] as PointerOrPrimitive // setterPointer
                              )
                          );
                      }
                  }
                : (noop as CallableDefineProperties),
            // callableGetLazyPropertyDescriptorStateByTarget
            IS_NOT_IN_SHADOW_REALM
                ? (targetPointer: Pointer) => {
                      targetPointer();
                      const target = selectedTarget!;
                      selectedTarget = undefined;
                      // We don't wrap the weak map `get()` call in a try-catch
                      // because we know `target` is an object.
                      const state = proxyTargetToLazyPropertyDescriptorStateMap.get(target);
                      return state ? getTransferablePointer(state) : state;
                  }
                : (noop as CallableGetLazyPropertyDescriptorStateByTarget),
            // callableGetPropertyValue
            IS_NOT_IN_SHADOW_REALM
                ? (targetPointer: Pointer, key: PropertyKey): PointerOrPrimitive => {
                      targetPointer();
                      const target = selectedTarget!;
                      selectedTarget = undefined;
                      let value: any;
                      try {
                          value = (target as any)[key];
                      } catch (error: any) {
                          throw pushErrorAcrossBoundary(error);
                      }
                      return (typeof value === 'object' && value !== null) ||
                          typeof value === 'function'
                          ? getTransferablePointer(value)
                          : value;
                  }
                : (noop as unknown as CallableGetPropertyValue),
            // callableGetTargetIntegrityTraits
            IS_NOT_IN_SHADOW_REALM
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
                      ...ownKeysAndUnforgeableGlobalThisKeys: PropertyKey[]
                  ) => {
                      const sliceIndex: number = ReflectApply(
                          ArrayProtoIndexOf,
                          ownKeysAndUnforgeableGlobalThisKeys,
                          [LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL]
                      );
                      let ownKeys: PropertyKey[];
                      let unforgeableGlobalThisKeys: PropertyKey[] | undefined;
                      if (sliceIndex === -1) {
                          ownKeys = ownKeysAndUnforgeableGlobalThisKeys;
                      } else {
                          ownKeys = ReflectApply(
                              ArrayProtoSlice,
                              ownKeysAndUnforgeableGlobalThisKeys,
                              [0, sliceIndex]
                          ) as PropertyKey[];
                          unforgeableGlobalThisKeys = ReflectApply(
                              ArrayProtoSlice,
                              ownKeysAndUnforgeableGlobalThisKeys,
                              [sliceIndex + 1]
                          ) as PropertyKey[];
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
                          (state as any)[ownKey] = true;
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
                                      return (target as any)[ownKey];
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
            IS_NOT_IN_SHADOW_REALM && liveTargetCallback
                ? (targetPointer: Pointer, targetTraits: TargetTraits): boolean => {
                      targetPointer();
                      const target = selectedTarget!;
                      selectedTarget = undefined;
                      if (target !== ObjectProto && target !== RegExpProto) {
                          try {
                              return liveTargetCallback(target, targetTraits);
                              // eslint-disable-next-line no-empty
                          } catch {}
                      }
                      return false;
                  }
                : (alwaysFalse as CallableIsTargetLive),
            // callableIsTargetRevoked
            IS_NOT_IN_SHADOW_REALM
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
                          return SymbolToStringTag in target
                              ? serializeTargetByTrialAndError(target)
                              : // Fast path.
                                serializeTargetByBrand(target);
                          // eslint-disable-next-line no-empty
                      } catch {}
                      return undefined;
                  }
                : (noop as CallableSerializeTarget),
            // callableSetLazyPropertyDescriptorStateByTarget
            IS_NOT_IN_SHADOW_REALM
                ? (targetPointer: Pointer, statePointer: Pointer) => {
                      targetPointer();
                      const target = selectedTarget!;
                      selectedTarget = undefined;
                      statePointer();
                      const state = selectedTarget!;
                      selectedTarget = undefined;
                      // We don't wrap the weak map `set()` call in a try-catch
                      // because we know `target` is an object.
                      proxyTargetToLazyPropertyDescriptorStateMap.set(target, state);
                  }
                : (noop as CallableSetLazyPropertyDescriptorStateByTarget),
            // callableTrackAsFastTarget
            IS_IN_SHADOW_REALM
                ? (targetPointer: Pointer) => {
                      targetPointer();
                      const target = selectedTarget!;
                      selectedTarget = undefined;
                      if (useFastForeignTargetPath) {
                          fastForeignTargetPointers.add(getTransferablePointer(target));
                      }
                  }
                : (noop as CallableTrackAsFastTarget),
            // callableBatchGetPrototypeOfAndGetOwnPropertyDescriptors
            (
                targetPointer: Pointer,
                foreignCallableDescriptorsCallback: CallableDescriptorsCallback
            ): PointerOrPrimitive => {
                targetPointer();
                const target = selectedTarget!;
                selectedTarget = undefined;
                let unsafeDescs;
                try {
                    unsafeDescs = ObjectGetOwnPropertyDescriptors(target);
                } catch (error: any) {
                    throw pushErrorAcrossBoundary(error);
                }
                const ownKeys = ReflectOwnKeys(unsafeDescs);
                const { length } = ownKeys;
                const descriptorTuples = new ArrayCtor(
                    length * 7
                ) as Parameters<CallableDescriptorCallback>;
                for (let i = 0, j = 0; i < length; i += 1, j += 7) {
                    const ownKey = ownKeys[i];
                    const safeDesc = (unsafeDescs as any)[ownKey];
                    ReflectSetPrototypeOf(safeDesc, null);
                    const { get: getter, set: setter, value } = safeDesc;
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
                              typeof getter === 'function'
                                ? getTransferablePointer(getter)
                                : getter
                            : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL;
                    descriptorTuples[j + 6] =
                        'set' in safeDesc
                            ? // Inline getTransferableValue().
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
                    if (ObjectHasOwn(target, key)) {
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
                    const { get: getter, set: setter, value } = safeDesc;
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
                              typeof getter === 'function'
                                ? getTransferablePointer(getter)
                                : getter
                            : LOCKER_NEAR_MEMBRANE_UNDEFINED_VALUE_SYMBOL,
                        'set' in safeDesc
                            ? // Inline getTransferableValue().
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
                24: foreignCallableGetPropertyValue,
                25: foreignCallableGetTargetIntegrityTraits,
                26: foreignCallableGetToStringTagOfTarget,
                27: foreignCallableInstallErrorPrepareStackTrace,
                // 28: callableInstallLazyPropertyDescriptors,
                29: foreignCallableIsTargetLive,
                30: foreignCallableIsTargetRevoked,
                31: foreignCallableSerializeTarget,
                32: foreignCallableSetLazyPropertyDescriptorStateByTarget,
                // 33: callableTrackAsFastTarget,
                34: foreignCallableBatchGetPrototypeOfAndGetOwnPropertyDescriptors,
                35: foreignCallableBatchGetPrototypeOfWhenHasNoOwnProperty,
                36: foreignCallableBatchGetPrototypeOfWhenHasNoOwnPropertyDescriptor,
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
            const applyTrapForFiveOrMoreArgs = createApplyOrConstructTrapForFiveOrMoreArgs(
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
            const constructTrapForFiveOrMoreArgs = createApplyOrConstructTrapForFiveOrMoreArgs(
                ProxyHandlerTraps.Construct
            );
            const constructTrapForAnyNumberOfArgs = createApplyOrConstructTrapForAnyNumberOfArgs(
                ProxyHandlerTraps.Construct
            );
            if (MINIFICATION_SAFE_TRAP_PROPERTY_NAMES === undefined) {
                // A minification safe way to get the 'apply' and 'construct'
                // trap property names.
                MINIFICATION_SAFE_TRAP_PROPERTY_NAMES = ObjectKeys({
                    applyTrapForZeroOrMoreArgs,
                    applyTrapForOneOrMoreArgs,
                    applyTrapForTwoOrMoreArgs,
                    applyTrapForThreeOrMoreArgs,
                    applyTrapForFourOrMoreArgs,
                    applyTrapForFiveOrMoreArgs,
                    applyTrapForAnyNumberOfArgs,
                    constructTrapForZeroOrMoreArgs,
                    constructTrapForOneOrMoreArgs,
                    constructTrapForTwoOrMoreArgs,
                    constructTrapForThreeOrMoreArgs,
                    constructTrapForFourOrMoreArgs,
                    constructTrapForFiveOrMoreArgs,
                    constructTrapForAnyNumberOfArgs,
                });
            }
            applyTrapNameRegistry[0] = MINIFICATION_SAFE_TRAP_PROPERTY_NAMES[0];
            applyTrapNameRegistry[1] = MINIFICATION_SAFE_TRAP_PROPERTY_NAMES[1];
            applyTrapNameRegistry[2] = MINIFICATION_SAFE_TRAP_PROPERTY_NAMES[2];
            applyTrapNameRegistry[3] = MINIFICATION_SAFE_TRAP_PROPERTY_NAMES[3];
            applyTrapNameRegistry[4] = MINIFICATION_SAFE_TRAP_PROPERTY_NAMES[4];
            applyTrapNameRegistry[5] = MINIFICATION_SAFE_TRAP_PROPERTY_NAMES[5];
            applyTrapNameRegistry.n = MINIFICATION_SAFE_TRAP_PROPERTY_NAMES[6];
            constructTrapNameRegistry[0] = MINIFICATION_SAFE_TRAP_PROPERTY_NAMES[7];
            constructTrapNameRegistry[1] = MINIFICATION_SAFE_TRAP_PROPERTY_NAMES[8];
            constructTrapNameRegistry[2] = MINIFICATION_SAFE_TRAP_PROPERTY_NAMES[9];
            constructTrapNameRegistry[3] = MINIFICATION_SAFE_TRAP_PROPERTY_NAMES[10];
            constructTrapNameRegistry[4] = MINIFICATION_SAFE_TRAP_PROPERTY_NAMES[11];
            constructTrapNameRegistry[5] = MINIFICATION_SAFE_TRAP_PROPERTY_NAMES[12];
            constructTrapNameRegistry.n = MINIFICATION_SAFE_TRAP_PROPERTY_NAMES[13];

            const { prototype: BoundaryProxyHandlerProto } = BoundaryProxyHandler;
            (BoundaryProxyHandlerProto as any)[applyTrapNameRegistry[0]] =
                applyTrapForZeroOrMoreArgs;
            (BoundaryProxyHandlerProto as any)[applyTrapNameRegistry[1]] =
                applyTrapForOneOrMoreArgs;
            (BoundaryProxyHandlerProto as any)[applyTrapNameRegistry[2]] =
                applyTrapForTwoOrMoreArgs;
            (BoundaryProxyHandlerProto as any)[applyTrapNameRegistry[3]] =
                applyTrapForThreeOrMoreArgs;
            (BoundaryProxyHandlerProto as any)[applyTrapNameRegistry[4]] =
                applyTrapForFourOrMoreArgs;
            (BoundaryProxyHandlerProto as any)[applyTrapNameRegistry[5]] =
                applyTrapForFiveOrMoreArgs;
            (BoundaryProxyHandlerProto as any)[applyTrapNameRegistry.n] =
                applyTrapForAnyNumberOfArgs;
            (BoundaryProxyHandlerProto as any)[constructTrapNameRegistry[0]] =
                constructTrapForZeroOrMoreArgs;
            (BoundaryProxyHandlerProto as any)[constructTrapNameRegistry[1]] =
                constructTrapForOneOrMoreArgs;
            (BoundaryProxyHandlerProto as any)[constructTrapNameRegistry[2]] =
                constructTrapForTwoOrMoreArgs;
            (BoundaryProxyHandlerProto as any)[constructTrapNameRegistry[3]] =
                constructTrapForThreeOrMoreArgs;
            (BoundaryProxyHandlerProto as any)[constructTrapNameRegistry[4]] =
                constructTrapForFourOrMoreArgs;
            (BoundaryProxyHandlerProto as any)[constructTrapNameRegistry[5]] =
                constructTrapForFiveOrMoreArgs;
            (BoundaryProxyHandlerProto as any)[constructTrapNameRegistry.n] =
                constructTrapForAnyNumberOfArgs;
            if (DEV_MODE) {
                // @ts-ignore: Prevent read-only property error.
                BoundaryProxyHandlerProto.color = color;
            }
            ReflectSetPrototypeOf(BoundaryProxyHandlerProto, null);
        };
    };
    /* eslint-enable prefer-object-spread */
}
