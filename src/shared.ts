const { isArray } = Array;

const {
    assign,
    create: ObjectCreate,
    defineProperty: ObjectDefineProperty,
    getOwnPropertyDescriptors,
    freeze,
    seal,
    isSealed,
    isFrozen,
} = Object;

const {
    apply,
    construct,
    deleteProperty,
    getPrototypeOf: ReflectGetPrototypeOf,
    setPrototypeOf: ReflectSetPrototypeOf,
    defineProperty: ReflectDefineProperty,
    isExtensible: ReflectIsExtensible,
    getOwnPropertyDescriptor: ReflectGetOwnPropertyDescriptor,
    ownKeys,
    preventExtensions: ReflectPreventExtensions,
} = Reflect;

const ErrorCreate = unconstruct(Error);
const SetCreate = unconstruct(Set);
const SetHas = unapply(Set.prototype.has);
const ProxyCreate = unconstruct(Proxy);
const WeakMapCreate = unconstruct(WeakMap);
const WeakMapGet = unapply(WeakMap.prototype.get);
const WeakMapHas = unapply(WeakMap.prototype.has);
const WeakMapSet = unapply(WeakMap.prototype.set);
const hasOwnProperty = unapply(Object.prototype.hasOwnProperty);
const map = unapply(Array.prototype.map);

export {
    apply,
    assign,
    construct,
    deleteProperty,
    ErrorCreate,
    ReflectGetPrototypeOf,
    ReflectSetPrototypeOf,
    ObjectCreate,
    ObjectDefineProperty,
    ProxyCreate,
    ReflectDefineProperty,
    ReflectIsExtensible,
    ReflectGetOwnPropertyDescriptor,
    SetCreate,
    SetHas,
    WeakMapCreate,
    WeakMapGet,
    WeakMapHas,
    WeakMapSet,
    getOwnPropertyDescriptors,
    ownKeys,
    ReflectPreventExtensions,
    hasOwnProperty,
    freeze,
    isArray,
    map,
    seal,
    isSealed,
    isFrozen,
};

export function unapply(func: Function): Function {
    return (thisArg: any, ...args: any[]) => apply(func, thisArg, args);
}

export function unconstruct(func: Function): Function {
    return (...args: any[]) => construct(func, args);
}

export function isUndefined(obj: any): obj is undefined {
    return obj === undefined;
}

export function isTrue(obj: any): obj is true {
    return obj === true;
}

export function isFunction(obj: any): obj is Function {
    return typeof obj === 'function';
}

export const emptyArray: [] = [];

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
