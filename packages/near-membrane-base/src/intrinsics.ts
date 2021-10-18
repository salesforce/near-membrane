import { VirtualEnvironment } from './environment';

const { includes: ArrayProtoIncludes } = Array.prototype;
const { has: SetProtoHas } = Set.prototype;
const {
    apply: ReflectApply,
    getOwnPropertyDescriptor: ReflectGetOwnPropertyDescriptor,
    ownKeys: ReflectOwnKeys,
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
const ESGlobalKeys = new Set([
    // *** 19.1 Value Properties of the Global Object
    'globalThis',
    'Infinity',
    'NaN',
    'undefined',

    // *** 19.2 Function Properties of the Global Object
    'eval', // dangerous
    'isFinite',
    'isNaN',
    'parseFloat',
    'parseInt',
    'decodeURI',
    'decodeURIComponent',
    'encodeURI',
    'encodeURIComponent',

    // *** 19.3 Constructor Properties of the Global Object
    'AggregateError',
    'Array',
    'ArrayBuffer',
    'BigInt',
    'BigInt64Array',
    'BigUint64Array',
    'Boolean',
    'DataView',
    // 'Date', // Unstable & Remapped
    'Error', // Unstable
    'EvalError',
    'FinalizationRegistry',
    'Float32Array',
    'Float64Array',
    'Function', // dangerous
    'Int8Array',
    'Int16Array',
    'Int32Array',
    // 'Map', // Remapped
    'Number',
    'Object',
    // Allow Blue `Promise` constructor to overwrite the Red one so that promises
    // created by the `Promise` constructor or APIs like `fetch` will work.
    // 'Promise', // Remapped
    'Proxy', // Unstable
    'RangeError',
    'ReferenceError',
    'RegExp', // Unstable
    // 'Set', // Remapped
    'SharedArrayBuffer',
    'String',
    'Symbol',
    'SyntaxError',
    'TypeError',
    'Uint8Array',
    'Uint8ClampedArray',
    'Uint16Array',
    'Uint32Array',
    'URIError',
    // 'WeakMap', // Remapped
    // 'WeakSet', // Remapped

    'WeakRef',

    // *** 18.4 Other Properties of the Global Object
    'Atomics',
    'JSON',
    'Math',
    'Reflect',

    // *** Annex B
    'escape',
    'unescape',

    // *** ECMA-402
    // 'Intl',  // Unstable & Remapped
]);

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

function assignFilteredGlobalObjectShapeDescriptors<T extends PropertyDescriptorMap>(
    descriptorMap: T,
    source: object
): T {
    const keys = ReflectOwnKeys(source) as (string | symbol)[];
    for (let i = 0, len = keys.length; i < len; i += 1) {
        // forcing to string here because of TypeScript's PropertyDescriptorMap
        // definition, which doesn't support symbols as entries.
        const key = keys[i];
        // avoid overriding ECMAScript global names that correspond
        // to global intrinsics. This guarantee that those entries
        // will be ignored if present in the endowments object.
        // TODO: what if the intent is to polyfill one of those
        // intrinsics?
        if (!isIntrinsicGlobalName(key) && !isReflectiveGlobalName(key)) {
            const unsafeDesc = ReflectGetOwnPropertyDescriptor(source, key)!;
            // Safari 14.0.x (macOS) and 14.2 (iOS) have a bug where 'showModalDialog'
            // is returned in the list of own keys produces by ReflectOwnKeys(iframeWindow),
            // however 'showModalDialog' is not an own property and produces
            // undefined at ReflectGetOwnPropertyDescriptor(window, key);
            //
            // In all other browsers, 'showModalDialog' is not an own property
            // and does not appear in the list produces by ReflectOwnKeys(iframeWindow).
            //
            // So, as a general rule: if there is not an own descriptor,
            // ignore the entry and continue.
            if (unsafeDesc) {
                (descriptorMap as any)[key] = unsafeDesc;
            }
        }
    }
    return descriptorMap;
}

function isIntrinsicGlobalName(key: string | symbol): boolean {
    return ReflectApply(SetProtoHas, ESGlobalKeys, [key]);
}

function isReflectiveGlobalName(key: string | symbol): boolean {
    return ReflectApply(ArrayProtoIncludes, ReflectiveIntrinsicObjectNames, [key]);
}

export function linkIntrinsics(
    env: VirtualEnvironment,
    globalObjectVirtualizationTarget: typeof globalThis
) {
    // remapping intrinsics that are realm's agnostic
    for (let i = 0, len = ReflectiveIntrinsicObjectNames.length; i < len; i += 1) {
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

export function getResolvedShapeDescriptors(...sources: any[]): PropertyDescriptorMap {
    const descriptors: PropertyDescriptorMap = {};
    for (let i = 0, len = sources.length; i < len; i += 1) {
        const source = sources[i];
        if (source) {
            assignFilteredGlobalObjectShapeDescriptors(descriptors, source);
        }
    }
    return descriptors;
}
