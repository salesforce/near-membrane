import { VirtualEnvironment } from './environment';
import { PropertyKeys } from './types';

const { includes: ArrayProtoIncludes } = Array.prototype;
const { assign: ObjectAssign } = Object;
const { apply: ReflectApply, ownKeys: ReflectOwnKeys } = Reflect;

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
    // Allow blue `Promise` constructor to overwrite the Red one so that promises
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
    'globalThis',
];

const ESGlobalsAndReflectiveIntrinsicObjectNames = [
    ...ESGlobalKeys,
    ...ReflectiveIntrinsicObjectNames,
];

export function assignFilteredGlobalDescriptorsFromPropertyDescriptorMap<
    T extends PropertyDescriptorMap
>(descMap: T, source: PropertyDescriptorMap): T {
    const ownKeys = ReflectOwnKeys(source);
    for (let i = 0, { length } = ownKeys; i < length; i += 1) {
        const ownKey = ownKeys[i];
        // Avoid overriding ECMAScript global names that correspond to
        // global intrinsics. This guarantee that those entries will be
        // ignored if present in the source property descriptor map.
        if (
            !ReflectApply(ArrayProtoIncludes, ESGlobalsAndReflectiveIntrinsicObjectNames, [ownKey])
        ) {
            const unsafeDesc = (source as any)[ownKey];
            if (unsafeDesc) {
                // Avoid poisoning by only installing own properties from
                // unsafeDesc. We don't use a toSafeDescriptor() style helper
                // since that mutates the unsafeBlueDesc.
                // eslint-disable-next-line prefer-object-spread
                (descMap as any)[ownKey] = ObjectAssign({ __proto__: null }, unsafeDesc);
            }
        }
    }
    return descMap;
}

export function getFilteredGlobalOwnKeys(source: object): PropertyKeys {
    const result: PropertyKeys = [];
    let resultOffset = 0;
    const ownKeys = ReflectOwnKeys(source);
    for (let i = 0, { length } = ownKeys; i < length; i += 1) {
        const ownKey = ownKeys[i];
        // Avoid overriding ECMAScript global names that correspond to global
        // intrinsics. This guarantees that those entries will be ignored if
        // present in the source object.
        if (
            !ReflectApply(ArrayProtoIncludes, ESGlobalsAndReflectiveIntrinsicObjectNames, [ownKey])
        ) {
            result[resultOffset++] = ownKey;
        }
    }
    return result;
}

export function linkIntrinsics(env: VirtualEnvironment, globalObject: typeof globalThis) {
    // Remap intrinsics that are realm agnostic.
    for (let i = 0, { length } = ReflectiveIntrinsicObjectNames; i < length; i += 1) {
        const globalName = ReflectiveIntrinsicObjectNames[i];
        const reflectiveValue = globalObject[globalName];
        if (reflectiveValue) {
            // Proxy.prototype is undefined.
            if (reflectiveValue.prototype) {
                env.link(globalName, 'prototype');
            } else {
                env.link(globalName);
            }
        }
    }
}
