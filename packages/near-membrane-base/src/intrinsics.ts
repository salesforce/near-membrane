import {
    ArrayProtoIncludes,
    ObjectAssign,
    ObjectHasOwn,
    ReflectApply,
    ReflectOwnKeys,
    toSafeArray,
} from '@locker/near-membrane-shared';
import { VirtualEnvironment } from './environment';

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
function getESGlobalKeys(remapTypedArrays = true) {
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
        'BigInt',
        'Boolean',
        // 'Date', // Remapped
        // 'Error', // Reflective
        // 'EvalError', // Reflective
        'FinalizationRegistry',
        // 'Function', // dangerous & Reflective
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

        'String',
        'Symbol',
        // 'SyntaxError', // Reflective
        // 'TypeError', // Reflective
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

    if (remapTypedArrays === false) {
        ESGlobalKeys.push(
            'ArrayBuffer',
            'BigInt64Array',
            'BigUint64Array',
            'DataView',
            'Float32Array',
            'Float64Array',
            'Int8Array',
            'Int16Array',
            'Int32Array',
            'SharedArrayBuffer',
            'Uint8Array',
            'Uint8ClampedArray',
            'Uint16Array',
            'Uint32Array'
        );
    }
    return ESGlobalKeys;
}

// These are foundational things that should never be wrapped but are equivalent
// @TODO: Revisit this list.
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

function getESGlobalsAndReflectiveIntrinsicObjectNames(remapTypedArrays = true) {
    const ESGlobalKeys = getESGlobalKeys(remapTypedArrays);
    return toSafeArray([...ESGlobalKeys, ...ReflectiveIntrinsicObjectNames]);
}

function getGlobalObjectOwnKeys(source: object): PropertyKey[] {
    const ownKeys = ReflectOwnKeys(source);
    // WKWebView incorrectly excludes the 'webkit' own property of the global
    // object from `Object.keys()` and `Reflect.ownKeys()` results, so add it.
    // istanbul ignore if: currently unreachable via tests
    if (ObjectHasOwn(source, 'webkit') && !ReflectApply(ArrayProtoIncludes, ownKeys, ['webkit'])) {
        ownKeys[ownKeys.length] = 'webkit';
    }
    return ownKeys;
}

export function assignFilteredGlobalDescriptorsFromPropertyDescriptorMap<
    T extends PropertyDescriptorMap
>(descs: T, source: PropertyDescriptorMap, includeTypedArrays?: boolean): T {
    const ownKeys = getGlobalObjectOwnKeys(source);
    const ESGlobalsAndReflectiveIntrinsicObjectNames =
        getESGlobalsAndReflectiveIntrinsicObjectNames(includeTypedArrays);
    for (let i = 0, { length } = ownKeys; i < length; i += 1) {
        const ownKey = ownKeys[i];
        // Avoid overriding ECMAScript global names that correspond to
        // global intrinsics. This guarantee that those entries will be
        // ignored if present in the source property descriptor map.
        if (!ESGlobalsAndReflectiveIntrinsicObjectNames.includes(ownKey as any)) {
            const unsafeDesc = (source as any)[ownKey];
            if (unsafeDesc) {
                // Avoid poisoning by only installing own properties from
                // unsafeDesc. We don't use a toSafeDescriptor() style helper
                // since that mutates the unsafeBlueDesc.
                // eslint-disable-next-line prefer-object-spread
                (descs as any)[ownKey] = ObjectAssign({ __proto__: null }, unsafeDesc);
            }
        }
    }
    return descs;
}

export function getFilteredGlobalOwnKeys(
    source: object,
    includeTypedArrays?: boolean
): PropertyKey[] {
    const result: PropertyKey[] = [];
    let resultOffset = 0;
    const ownKeys = getGlobalObjectOwnKeys(source);
    const ESGlobalsAndReflectiveIntrinsicObjectNames =
        getESGlobalsAndReflectiveIntrinsicObjectNames(includeTypedArrays);
    for (let i = 0, { length } = ownKeys; i < length; i += 1) {
        const ownKey = ownKeys[i];
        // Avoid overriding ECMAScript global names that correspond to global
        // intrinsics. This guarantees that those entries will be ignored if
        // present in the source object.
        if (!ESGlobalsAndReflectiveIntrinsicObjectNames.includes(ownKey as any)) {
            result[resultOffset++] = ownKey;
        }
    }
    return result;
}

export function linkIntrinsics(env: VirtualEnvironment, globalObject: typeof globalThis) {
    // Remap intrinsics that are realm agnostic.
    for (let i = 0, { length } = ReflectiveIntrinsicObjectNames; i < length; i += 1) {
        const globalName = ReflectiveIntrinsicObjectNames[i];
        const reflectiveValue = (globalObject as any)[globalName];
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
