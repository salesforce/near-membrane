import {
    assignFilteredGlobalDescriptorsFromPropertyDescriptorMap,
    createBlueConnector,
    createRedConnector,
    getFilteredGlobalOwnKeys,
    linkIntrinsics,
    VirtualEnvironment,
} from '../../dist/index';

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
    // 'JSON', // Remapped
    'Math',
    'Reflect',

    // *** Annex B
    'escape',
    'unescape',

    // *** ECMA-402
    // 'Intl',  // Remapped
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
    'globalThis',
];

const RemappedIntrinsicObjectNames = [
    'ArrayBuffer',
    'Atomics',
    'BigInt64Array',
    'BigUint64Array',
    'DataView',
    'Date',
    'Float32Array',
    'Float64Array',
    'Int16Array',
    'Int32Array',
    'Int8Array',
    'Intl',
    'Map',
    'Promise',
    'Set',
    'SharedArrayBuffer',
    'Uint16Array',
    'Uint32Array',
    'Uint8Array',
    'Uint8ClampedArray',
    'WeakMap',
    'WeakSet',
];

describe('assignFilteredGlobalDescriptorsFromPropertyDescriptorMap', () => {
    it('ignores non-remapped ES intrinsics', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(ESGlobalKeys.length);

        const shape = ESGlobalKeys.reduce((accum, key) => {
            accum[key] = globalThis[key];
            return accum;
        }, {});
        const descMap = assignFilteredGlobalDescriptorsFromPropertyDescriptorMap(
            {},
            Object.getOwnPropertyDescriptors(shape)
        );
        for (const key of ESGlobalKeys) {
            expect(key in descMap).toBe(false);
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
        const descMap = assignFilteredGlobalDescriptorsFromPropertyDescriptorMap(
            {},
            Object.getOwnPropertyDescriptors(shape)
        );
        for (const key of ReflectiveIntrinsicObjectNames) {
            expect(key in descMap).toBe(false);
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
        const descMap = assignFilteredGlobalDescriptorsFromPropertyDescriptorMap(
            {},
            Object.getOwnPropertyDescriptors(shape)
        );
        for (const key of RemappedIntrinsicObjectNames) {
            expect(descMap[key]).toBeDefined();
        }
    });
    it('should create a descriptor for non-ES built-ins', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);

        const descMap = assignFilteredGlobalDescriptorsFromPropertyDescriptorMap(
            {},
            Object.getOwnPropertyDescriptors({
                Foo: 1,
            })
        );
        // Ignoring
        //  "Property 'toMatchObject' does not exist on type 'Matchers<PropertyDescriptor>'."
        // @ts-ignore
        expect(descMap.Foo).toMatchObject({
            configurable: true,
            enumerable: true,
            value: 1,
            writable: true,
        });
    });
});

describe('getFilteredGlobalOwnKeys', () => {
    it('ignores non-remapped ES intrinsics', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(ESGlobalKeys.length);

        const shape = ESGlobalKeys.reduce((accum, key) => {
            accum[key] = globalThis[key];
            return accum;
        }, {});
        const filteredOwnKeys = getFilteredGlobalOwnKeys(shape);
        for (const key of ESGlobalKeys) {
            expect(filteredOwnKeys.includes(key)).toBe(false);
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
        const filteredOwnKeys = getFilteredGlobalOwnKeys(shape);
        for (const key of ReflectiveIntrinsicObjectNames) {
            expect(filteredOwnKeys.includes(key)).toBe(false);
        }
    });
    it('includes Remapped ES intrinsics', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);

        const shape = RemappedIntrinsicObjectNames.reduce((accum, key) => {
            accum[key] = globalThis[key];
            return accum;
        }, {});
        const filteredOwnKeys = getFilteredGlobalOwnKeys(shape);
        expect(filteredOwnKeys).toEqual(RemappedIntrinsicObjectNames);
    });
    it('should include non-ES built-ins', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);

        const filteredOwnKeys = getFilteredGlobalOwnKeys({
            Foo: 1,
        });
        expect(filteredOwnKeys).toEqual(['Foo']);
    });
});

describe('linkIntrinsics()', () => {
    it('skips reflective intrinsics that do not exist on the global object virtualization target', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);

        const ve = new VirtualEnvironment({
            blueConnector: createBlueConnector(globalThis as any),
            redConnector: createRedConnector(globalThis.eval),
        });
        ve.link('globalThis');

        let count = 0;
        // Now overwrite it so we can ensure that it does not get called.
        ve.link = () => {
            count += 1;
        };
        // Since there are no intrinsics at all, ve.link should never get called.
        // @ts-ignore
        linkIntrinsics(ve, {});

        expect(count).toBe(0);
    });
});
