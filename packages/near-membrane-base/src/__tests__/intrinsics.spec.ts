import { getResolvedShapeDescriptors } from '../index';

const ESGlobalKeys = [
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
];

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

const RemappedIntrinsicObjectNames = [
    'Date',
    'Map',
    'Promise',
    'Set',
    'WeakMap',
    'WeakSet',
    'Intl',
];

describe('getResolvedShapeDescriptors()', () => {
    it('ignores non-remapped ES intrinsics', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(ESGlobalKeys.length);

        const shape = ESGlobalKeys.reduce((accum, key) => {
            accum[key] = globalThis[key];
            return accum;
        }, {});

        const filteredEndowmentDescriptors = getResolvedShapeDescriptors(shape);

        for (let i = 0; i < ESGlobalKeys.length; i += 1) {
            const key = ESGlobalKeys[i];
            expect(filteredEndowmentDescriptors[key]).toBe(undefined);
        }
    });
    it('ignores Reflective ES intrinsics', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(ReflectiveIntrinsicObjectNames.length);

        const shape = ReflectiveIntrinsicObjectNames.reduce((accum, key) => {
            accum[key] = globalThis[key];
            return accum;
        }, {});

        const filteredEndowmentDescriptors = getResolvedShapeDescriptors(shape);

        for (let i = 0; i < ReflectiveIntrinsicObjectNames.length; i += 1) {
            const key = ReflectiveIntrinsicObjectNames[i];
            expect(filteredEndowmentDescriptors[key]).toBe(undefined);
        }
    });
    it('includes Remapped ES intrinsics', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(RemappedIntrinsicObjectNames.length);

        const shape = RemappedIntrinsicObjectNames.reduce((accum, key) => {
            accum[key] = globalThis[key];
            return accum;
        }, {});

        const filteredEndowmentDescriptors = getResolvedShapeDescriptors(shape);

        for (let i = 0; i < RemappedIntrinsicObjectNames.length; i += 1) {
            const key = RemappedIntrinsicObjectNames[i];
            expect(filteredEndowmentDescriptors[key]).not.toBe(undefined);
        }
    });
    it('should create a descriptor for non-ES built-ins', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);
        const filteredEndowmentDescriptors = getResolvedShapeDescriptors({
            Foo: 1,
        });
        // Ignoring
        //  "Property 'toMatchObject' does not exist on type 'Matchers<PropertyDescriptor>'."
        // @ts-ignore
        expect(filteredEndowmentDescriptors.Foo).toMatchObject({
            configurable: true,
            enumerable: true,
            value: 1,
            writable: true,
        });
    });
});
