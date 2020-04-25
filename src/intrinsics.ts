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
import { SandboxRegistry } from './registry';

// TODO: type this better based on ReflectiveIntrinsicObjectNames
type ReflectiveIntrinsicsMap = Record<string, any>;

const cachedReflectiveIntrinsicsMap: WeakMap<typeof globalThis, ReflectiveIntrinsicsMap> = WeakMapCreate();

export const ESGlobalKeys = SetCreate([

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
    'Array',
    'ArrayBuffer',
    'Boolean',
    'DataView',
    'Date', // Unstable
    'Error', // Unstable
    'EvalError',
    'Float32Array',
    'Float64Array',
    'Function', // dangerous
    'Int8Array',
    'Int16Array',
    'Int32Array',
    'Map',
    'Number',
    'Object',
    'Promise', // Unstable
    'Proxy', // Unstable
    'RangeError',
    'ReferenceError',
    'RegExp', // Unstable
    'Set',
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
    'WeakMap',
    'WeakSet',

    // *** 18.4 Other Properties of the Global Object
    'Atomics',
    'JSON',
    'Math',
    'Reflect',

    // *** Annex B
    'escape',
    'unescape',

    // *** ECMA-402
    'Intl', // Unstable
]);

// These are foundational things that should never be wrapped but are equivalent
// TODO: revisit this list.
const ReflectiveIntrinsicObjectNames = [
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

export const UndeniableGlobalNames = SetCreate([
    'Array',
    'Boolean',
    'Error',
    'EvalError',
    'Function',
    'Object',
    'Promise',
    'RangeError',
    'ReferenceError',
    'RegExp',
    'String',
    'SyntaxError',
    'TypeError',
    'URIError',
]);

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
    registry: SandboxRegistry,
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
        registry.setRefMapEntries(red, blue);
        registry.setRefMapEntries(red.prototype, blue.prototype);
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
        // to undeniable intrinsics. This guarantee that those entries
        // will be ignored if present in the endowments object.
        if (!SetHas(UndeniableGlobalNames, key)) {
            to[key] = endowmentsDescriptors[key];
        }
    }
    return to;
}