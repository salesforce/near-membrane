import {
    isUndefined,
    ObjectCreate,
    WeakMapCreate,
    WeakMapSet,
    WeakMapGet,
    SetCreate,
    SetHas,
    ownKeys,
    getOwnPropertyDescriptors,
} from './shared';
import { SecureEnvironment } from './environment';

// TODO: type this better based on ReflectiveIntrinsicObjectNames
type ReflectiveIntrinsicsMap = Record<string, any>;

const cachedReflectiveIntrinsicsMap: WeakMap<typeof globalThis, ReflectiveIntrinsicsMap> = WeakMapCreate();

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
const ESGlobalKeys = SetCreate([

    // *** 18.1 Value Properties of the Global Object
    'Infinity',
    'NaN',
    'undefined',

    // *** 18.2 Function Properties of the Global Object
    'eval', // dangerous
    'isFinite',
    'isNaN',
    'parseFloat',
    'parseInt',
    'decodeURI',
    'decodeURIComponent',
    'encodeURI',
    'encodeURIComponent',

    // *** 18.3 Constructor Properties of the Global Object
    'AggregateError',
    'Array',
    'ArrayBuffer',
    'Boolean',
    'DataView',
    // 'Date', // Unstable & Remapped
    'Error', // Unstable
    'EvalError',
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
    'RangeError',
    'ReferenceError',
    'SyntaxError',
    'TypeError',
    'URIError',
];

function getReflectiveIntrinsics(global: typeof globalThis): ReflectiveIntrinsicsMap {
    let reflectiveIntrinsics: ReflectiveIntrinsicsMap | undefined = WeakMapGet(cachedReflectiveIntrinsicsMap, global);
    if (!isUndefined(reflectiveIntrinsics)) {
        return reflectiveIntrinsics;
    }
    reflectiveIntrinsics = ObjectCreate(null) as ReflectiveIntrinsicsMap;
    WeakMapSet(cachedReflectiveIntrinsicsMap, global, reflectiveIntrinsics);
    // remapping intrinsics that are realm's agnostic
    for (let i = 0, len = ReflectiveIntrinsicObjectNames.length; i < len; i += 1) {
        const name = ReflectiveIntrinsicObjectNames[i];
        reflectiveIntrinsics[name] = global[name];
    }
    return reflectiveIntrinsics;
}

export function linkIntrinsics(
    env: SecureEnvironment,
    blueGlobalThis: typeof globalThis,
    redGlobalThis: typeof globalThis
) {
    // remapping intrinsics that are realm's agnostic
    const blueIntrinsics = getReflectiveIntrinsics(blueGlobalThis);
    const redIntrinsics = getReflectiveIntrinsics(redGlobalThis);
    for (let i = 0, len = ReflectiveIntrinsicObjectNames.length; i < len; i += 1) {
        const name = ReflectiveIntrinsicObjectNames[i];
        const blue = blueIntrinsics[name];
        const red = redIntrinsics[name];
        // new intrinsics might not be available in some browsers, e.g.: AggregateError
        if (!isUndefined(blue)) {
            env.setRefMapEntries(red, blue);
            env.setRefMapEntries(red.prototype, blue.prototype);
        }
    }
}

export function getFilteredEndowmentDescriptors(endowments: object): PropertyDescriptorMap {
    const to: PropertyDescriptorMap = ObjectCreate(null);
    const endowmentsDescriptors = getOwnPropertyDescriptors(endowments);
    const globalKeys = ownKeys(endowmentsDescriptors);
    for (let i = 0, len = globalKeys.length; i < len; i++) {
        // forcing to string here because of TypeScript's PropertyDescriptorMap definition, which doesn't
        // support symbols as entries.
        const key = globalKeys[i] as string;
        // avoid overriding ECMAScript global names that correspond
        // to global intrinsics. This guarantee that those entries
        // will be ignored if present in the endowments object.
        // TODO: what if the intent is to polyfill one of those
        // intrinsics?
        if (!SetHas(ESGlobalKeys, key)) {
            to[key] = endowmentsDescriptors[key];
        }
    }
    return to;
}

export function isIntrinsicGlobalName(key: PropertyKey): boolean {
    return SetHas(ESGlobalKeys, key);
}
