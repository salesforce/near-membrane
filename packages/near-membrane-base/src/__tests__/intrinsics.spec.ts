import { getFilteredEndowmentDescriptors, isIntrinsicGlobalName } from '../index';

const intrinsicNames = [
    'Infinity',
    'NaN',
    'undefined',
    'eval', // dangerous
    'isFinite',
    'isNaN',
    'parseFloat',
    'parseInt',
    'decodeURI',
    'decodeURIComponent',
    'encodeURI',
    'encodeURIComponent',
    'AggregateError',
    'Array',
    'ArrayBuffer',
    'BigInt',
    'BigInt64Array',
    'BigUint64Array',
    'Boolean',
    'DataView',
    'Error', // Unstable
    'EvalError',
    'FinalizationRegistry',
    'Float32Array',
    'Float64Array',
    'Function', // dangerous
    'Int8Array',
    'Int16Array',
    'Int32Array',
    'Number',
    'Object',
    'Proxy', // Unstable
    'RangeError',
    'ReferenceError',
    'RegExp', // Unstable
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
    'WeakRef',
    'Atomics',
    'JSON',
    'Math',
    'Reflect',
    'escape',
    'unescape',
];
const remappedIntrinsicNames = [
    'Date', // Unstable & Remapped
    'Map', // Remapped
    'Promise', // Remapped
    'Set', // Remapped
    'WeakMap', // Remapped
    'WeakSet', // Remapped
    'Intl', // Unstable & Remapped
];

describe('isIntrinsicGlobalName()', () => {
    it('should return false foe ES global names that are remapped', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(remappedIntrinsicNames.length);
        remappedIntrinsicNames.forEach((remappedIntrinsicName) => {
            expect(isIntrinsicGlobalName(remappedIntrinsicName)).toBe(false);
        });
    });
    it('should return true for all non-remapped ES global names', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(intrinsicNames.length);
        intrinsicNames.forEach((intrinsicName) => {
            expect(isIntrinsicGlobalName(intrinsicName)).toBe(true);
        });
    });
});

describe('getFilteredEndowmentDescriptors()', () => {
    it('ignores ES built-ins', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);
        const filteredEndowmentDescriptors = getFilteredEndowmentDescriptors({
            Math,
        });
        expect(filteredEndowmentDescriptors.Math).toBe(undefined);
    });
    it('should create a descriptor for non-ES built-ins', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);
        const filteredEndowmentDescriptors = getFilteredEndowmentDescriptors({
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
