const { isArray } = Array;

const {
    create: ObjectCreate,
    getOwnPropertyDescriptors,
    getOwnPropertyNames,
    getOwnPropertySymbols,
    freeze,
    seal,
    isSealed,
    isFrozen,
} = Object;

const {
    apply,
    construct,
    getPrototypeOf,
    setPrototypeOf,
    defineProperty: ObjectDefineProperty,
    isExtensible,
    getOwnPropertyDescriptor,
    preventExtensions,
} = Reflect;

const hasOwnProperty = unapply(Object.prototype.hasOwnProperty);
const map = unapply(Array.prototype.map);
const push = unapply(Array.prototype.push);

export {
    apply,
    construct,
    getPrototypeOf,
    setPrototypeOf,
    ObjectCreate,
    ObjectDefineProperty,
    isExtensible,
    getOwnPropertyDescriptor,
    getOwnPropertyDescriptors,
    getOwnPropertyNames,
    getOwnPropertySymbols,
    preventExtensions,
    hasOwnProperty,
    freeze,
    isArray,
    map,
    push,
    seal,
    isSealed,
    isFrozen,
};

export function unapply(func: Function): Function {
    return (thisArg: any, ...args: any[]) => apply(func, thisArg, args);
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

export const ESGlobalKeys = new Set([

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
    // 'SharedArrayBuffer', // removed on Jan 5, 2018
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

    // 'Atomics', // removed on Jan 5, 2018
    'JSON',
    'Math',
    'Reflect',

    // *** Annex B

    'escape',
    'unescape',

    // *** ECMA-402

    'Intl', // Unstable
]);

// Variation of the polyfill described here:
// https://mathiasbynens.be/notes/globalthis
// Note: we don't polyfill it, just use it.
// Note: we don't cache it, to accommodate jest for now
export function getGlobalThis() {
    if (typeof globalThis === 'object') {
        return globalThis;
    }
    // @ts-ignore funky stuff to get the global reference in all environments
	Object.prototype.__defineGetter__('__magic__', function(this: object) {
		return this;
    });
    // @ts-ignore
	const gt = __magic__;
    delete (Object.prototype as any).__magic__;
    return gt;
}
