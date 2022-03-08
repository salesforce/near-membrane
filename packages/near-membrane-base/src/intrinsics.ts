import { VirtualEnvironment } from './environment';

const { includes: ArrayProtoIncludes, push: ArrayProtoPush } = Array.prototype;
const { assign: ObjectAssign } = Object;
const {
    apply: ReflectApply,
    getOwnPropertyDescriptor: ReflectGetOwnPropertyDescriptor,
    ownKeys: ReflectOwnKeys,
    setPrototypeOf: ReflectSetPrototypeOf,
} = Reflect;

/**
 * This list must be in sync with ecma-262, anything new added to the global object
 * should be considered, to decide whether or not they need remapping. The default
 * behavior, if missing form the following list, is to be remapped, which is safer.
 *
 * Note: remapped means the functionality is provided by the blue realm, rather than
 * the red one. This helps with the identity discontinuity issue, e.g.: all Set objects
 * have the same identity because it is always derived from the outer realm's Set.
 *
 * Note 1: We have identified 3 types of intrinsics
 * A: primitives driven intrinsics
 * B: syntax driven intrinsics (they usually have a imperative form as well)
 * C: imperative only intrinsics
 *
 * While A is not remapped, it is safe, and works fast that way, and C is remapped to
 * preserve the identity of all produced objects from the same realm, B is really
 * problematic, and requires a lot more work to guarantee that objects from both sides
 * can be considered equivalents (without identity discontinuity).
 */
const ESGlobalKeys = [
    // *** 19.1 Value Properties of the Global Object
    'globalThis',
    'Infinity',
    'NaN',
    'undefined',

    // *** 19.2 Function Properties of the Global Object
    // 'eval', // dangerous & Reflective
    'isFinite',
    'isNaN',
    'parseFloat',
    'parseInt',
    'decodeURI',
    'decodeURIComponent',
    'encodeURI',
    'encodeURIComponent',

    // *** 19.3 Constructor Properties of the Global Object
    // 'AggregateError', // Reflective
    // 'Array', // Reflective
    // 'ArrayBuffer', // Remapped
    'BigInt',
    // 'BigInt64Array', // Remapped
    // 'BigUint64Array', // Remapped
    'Boolean',
    // 'DataView', // Remapped
    // 'Date', // Remapped
    // 'Error', // Reflective
    // 'EvalError', // Reflective
    'FinalizationRegistry',
    // 'Float32Array', // Remapped
    // 'Float64Array', // Remapped
    // 'Function', // dangerous & Reflective
    // 'Int8Array', // Remapped
    // 'Int16Array', // Remapped
    // 'Int32Array', // Remapped
    // 'Map', // Remapped
    'Number',
    // 'Object', // Reflective
    // Allow Blue `Promise` constructor to overwrite the Red one so that promises
    // created by the `Promise` constructor or APIs like `fetch` will work.
    // 'Promise', // Remapped
    // 'Proxy', // Reflective
    // 'RangeError', // Reflective
    // 'ReferenceError', // Reflective
    'RegExp',
    // 'Set', // Remapped
    // 'SharedArrayBuffer', // Remapped
    'String',
    'Symbol',
    // 'SyntaxError', // Reflective
    // 'TypeError', // Reflective
    // 'Uint8Array', // Remapped
    // 'Uint8ClampedArray', // Remapped
    // 'Uint16Array', // Remapped
    // 'Uint32Array', // Remapped
    // 'URIError', // Reflective
    // 'WeakMap', // Remapped
    // 'WeakSet', // Remapped
    'WeakRef',

    // *** 18.4 Other Properties of the Global Object
    // 'Atomics', // Remapped
    'JSON',
    'Math',
    'Reflect',

    // *** Annex B
    'escape',
    'unescape',

    // *** ECMA-402
    // 'Intl',  // Remapped
];

// These are foundational things that should never be wrapped but are equivalent
// TODO: revisit this list.
const ReflectiveIntrinsicObjectNames = [
    'AggregateError',
    'Array',
    'Error',
    'EvalError',
    'Function',
    'Object',
    'Proxy',
    'RangeError',
    'ReferenceError',
    'SyntaxError',
    'TypeError',
    'URIError',
    'eval',
];

const ESGlobalsAndReflectiveIntrinsicObjectNames = [
    ...ESGlobalKeys,
    ...ReflectiveIntrinsicObjectNames,
];

export function assignFilteredGlobalDescriptors<T extends PropertyDescriptorMap>(
    descMap: T,
    source?: object,
    sourceForDesc = source
): T {
    if (source) {
        const ownKeys = ReflectOwnKeys(source);
        for (let i = 0, { length } = ownKeys; i < length; i += 1) {
            const ownKey = ownKeys[i];
            // Avoid overriding ECMAScript global names that correspond
            // to global intrinsics. This guarantee that those entries
            // will be ignored if present in the endowments descriptor map.
            // TODO: what if the intent is to polyfill one of those
            // intrinsics?
            if (
                !ReflectApply(ArrayProtoIncludes, ESGlobalsAndReflectiveIntrinsicObjectNames, [
                    ownKey,
                ])
            ) {
                // Safari 14.0.x (macOS) and 14.2 (iOS) have a bug where
                // 'showModalDialog' is returned in the list of own keys produces
                // by ReflectOwnKeys(iframeWindow), however 'showModalDialog' is
                // not an own property and produces undefined at
                // ReflectGetOwnPropertyDescriptor(window, key).
                //
                // In all other browsers, 'showModalDialog' is not an own property
                // and does not appear in the list produces by
                // ReflectOwnKeys(iframeWindow).
                //
                // So, as a general rule: if there is not an own descriptor,
                // ignore the entry and continue.
                const desc = ReflectGetOwnPropertyDescriptor(sourceForDesc!, ownKey);
                if (desc) {
                    ReflectSetPrototypeOf(desc, null);
                    (descMap as any)[ownKey] = desc;
                }
            }
        }
    }
    return descMap;
}

export function assignFilteredGlobalDescriptorsFromPropertyDescriptorMap<
    T extends PropertyDescriptorMap
>(descMap: T, source?: PropertyDescriptorMap, sourceForDesc = source): T {
    if (source) {
        const ownKeys = ReflectOwnKeys(source);
        for (let i = 0, { length } = ownKeys; i < length; i += 1) {
            const ownKey = ownKeys[i];
            // Avoid overriding ECMAScript global names that correspond
            // to global intrinsics. This guarantee that those entries
            // will be ignored if present in the endowments descriptor map.
            // TODO: what if the intent is to polyfill one of those
            // intrinsics?
            if (
                !ReflectApply(ArrayProtoIncludes, ESGlobalsAndReflectiveIntrinsicObjectNames, [
                    ownKey,
                ])
            ) {
                const unsafeDesc = (sourceForDesc as any)[ownKey];
                if (unsafeDesc) {
                    // Avoid poisoning by only installing own properties from
                    // unsafeDesc. We don't use a toSafeDescriptor() style helper
                    // since that mutates the unsafeBlueDesc.
                    // eslint-disable-next-line prefer-object-spread
                    (descMap as any)[ownKey] = ObjectAssign({ __proto__: null }, unsafeDesc);
                }
            }
        }
    }
    return descMap;
}

export function getFilteredGlobalOwnKeys(source: object): (string | symbol)[] {
    const result: (string | symbol)[] = [];
    const ownKeys = ReflectOwnKeys(source);
    for (let i = 0, { length } = ownKeys; i < length; i += 1) {
        const ownKey = ownKeys[i];
        // Avoid overriding ECMAScript global names that correspond
        // to global intrinsics. This guarantee that those entries
        // will be ignored if present in the endowments descriptor map.
        // TODO: what if the intent is to polyfill one of those
        // intrinsics?
        if (
            !ReflectApply(ArrayProtoIncludes, ESGlobalsAndReflectiveIntrinsicObjectNames, [ownKey])
        ) {
            ReflectApply(ArrayProtoPush, result, [ownKey]);
        }
    }
    return result;
}

export function linkIntrinsics(
    env: VirtualEnvironment,
    globalObjectVirtualizationTarget: typeof globalThis
) {
    // remapping intrinsics that are realm agnostic
    for (let i = 0, { length } = ReflectiveIntrinsicObjectNames; i < length; i += 1) {
        const globalName = ReflectiveIntrinsicObjectNames[i];
        const reflectiveValue = globalObjectVirtualizationTarget[globalName];
        if (reflectiveValue) {
            env.link(globalName);
            // Proxy.prototype is undefined, being the only weird thing here
            if (reflectiveValue.prototype) {
                env.link(globalName, 'prototype');
            }
        }
    }
}
