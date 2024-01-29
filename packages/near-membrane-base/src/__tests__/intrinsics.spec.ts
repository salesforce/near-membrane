// @ts-nocheck
import {
    assignFilteredGlobalDescriptorsFromPropertyDescriptorMap,
    createBlueConnector,
    createRedConnector,
    getFilteredGlobalOwnKeys,
    linkIntrinsics,
    VirtualEnvironment,
} from '../../dist/index.mjs.js';

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
    'Atomics',
    'Date',
    'Intl',
    'Map',
    'Promise',
    'Set',
    'WeakMap',
    'WeakSet',
];

const TypedAraysInstrinsics = [
    'ArrayBuffer',
    'BigInt64Array',
    'BigUint64Array',
    'DataView',
    'Float32Array',
    'Float64Array',
    'Int16Array',
    'Int32Array',
    'Int8Array',
    'SharedArrayBuffer',
    'Uint16Array',
    'Uint32Array',
    'Uint8Array',
    'Uint8ClampedArray',
];

describe('assignFilteredGlobalDescriptorsFromPropertyDescriptorMap', () => {
    it('ignores non-remapped ES intrinsics', () => {
        expect.assertions(ESGlobalKeys.length);

        const shape = ESGlobalKeys.reduce((accum, key) => {
            (accum as any)[key] = (globalThis as any)[key];
            return accum;
        }, {});
        const descs = assignFilteredGlobalDescriptorsFromPropertyDescriptorMap(
            {},
            Object.getOwnPropertyDescriptors(shape)
        );
        for (const key of ESGlobalKeys) {
            expect(key in descs).toBe(false);
        }
    });
    it('ignores Reflective ES intrinsics', () => {
        expect.assertions(ReflectiveIntrinsicObjectNames.length);

        const shape = ReflectiveIntrinsicObjectNames.reduce((accum, key) => {
            (accum as any)[key] = (globalThis as any)[key];
            return accum;
        }, {});
        const descs = assignFilteredGlobalDescriptorsFromPropertyDescriptorMap(
            {},
            Object.getOwnPropertyDescriptors(shape)
        );
        for (const key of ReflectiveIntrinsicObjectNames) {
            expect(key in descs).toBe(false);
        }
    });
    it('includes Remapped ES intrinsics', () => {
        const remappedObjectNames = [...RemappedIntrinsicObjectNames, ...TypedAraysInstrinsics];
        expect.assertions(remappedObjectNames.length);

        const shape = remappedObjectNames.reduce((accum, key) => {
            (accum as any)[key] = (globalThis as any)[key];
            return accum;
        }, {});
        const descs = assignFilteredGlobalDescriptorsFromPropertyDescriptorMap(
            {},
            Object.getOwnPropertyDescriptors(shape)
        );
        for (const key of remappedObjectNames) {
            expect(descs[key]).toBeDefined();
        }
    });
    it('should create a descriptor for non-ES built-ins', () => {
        const descs = assignFilteredGlobalDescriptorsFromPropertyDescriptorMap(
            {},
            Object.getOwnPropertyDescriptors({
                Foo: 1,
            })
        );
        expect(descs.Foo).toMatchObject({
            configurable: true,
            enumerable: true,
            value: 1,
            writable: true,
        });
    });
    it('should not remap TypedArrays when flag is false', () => {
        expect.assertions(RemappedIntrinsicObjectNames.length);

        const shape = RemappedIntrinsicObjectNames.reduce((accum, key) => {
            (accum as any)[key] = (globalThis as any)[key];
            return accum;
        }, {});
        const descs = assignFilteredGlobalDescriptorsFromPropertyDescriptorMap(
            {},
            Object.getOwnPropertyDescriptors(shape),
            false
        );
        for (const key of RemappedIntrinsicObjectNames) {
            expect(descs[key]).toBeDefined();
        }
    });
});

describe('getFilteredGlobalOwnKeys', () => {
    it('ignores non-remapped ES intrinsics', () => {
        expect.assertions(ESGlobalKeys.length);

        const shape = ESGlobalKeys.reduce((accum, key) => {
            (accum as any)[key] = (globalThis as any)[key];
            return accum;
        }, {});
        const filteredOwnKeys = getFilteredGlobalOwnKeys(shape);
        for (const key of ESGlobalKeys) {
            expect(filteredOwnKeys.includes(key)).toBe(false);
        }
    });
    it('ignores Reflective ES intrinsics', () => {
        expect.assertions(ReflectiveIntrinsicObjectNames.length);

        const shape = ReflectiveIntrinsicObjectNames.reduce((accum, key) => {
            (accum as any)[key] = (globalThis as any)[key];
            return accum;
        }, {});
        const filteredOwnKeys = getFilteredGlobalOwnKeys(shape);
        for (const key of ReflectiveIntrinsicObjectNames) {
            expect(filteredOwnKeys.includes(key)).toBe(false);
        }
    });
    it('includes Remapped ES intrinsics', () => {
        const remappedObjectNames = [...RemappedIntrinsicObjectNames, ...TypedAraysInstrinsics];
        const shape = remappedObjectNames.reduce((accum, key) => {
            (accum as any)[key] = (globalThis as any)[key];
            return accum;
        }, {});
        const filteredOwnKeys = getFilteredGlobalOwnKeys(shape);
        expect(filteredOwnKeys).toEqual(remappedObjectNames);
    });
    it('should include non-ES built-ins', () => {
        const filteredOwnKeys = getFilteredGlobalOwnKeys({
            Foo: 1,
        });
        expect(filteredOwnKeys).toEqual(['Foo']);
    });
    it('should not remap TypedArrays when flag is false', () => {
        const shape = RemappedIntrinsicObjectNames.reduce((accum, key) => {
            (accum as any)[key] = (globalThis as any)[key];
            return accum;
        }, {});
        const filteredOwnKeys = getFilteredGlobalOwnKeys(shape, false);
        expect(filteredOwnKeys).toEqual(RemappedIntrinsicObjectNames);
    });
});

describe('linkIntrinsics()', () => {
    it('skips reflective intrinsics that do not exist on the global object virtualization target', () => {
        const env = new VirtualEnvironment({
            blueConnector: createBlueConnector(globalThis as any),
            redConnector: createRedConnector(globalThis.eval),
        });
        env.link('globalThis');

        let count = 0;
        // Now overwrite it so we can ensure that it does not get called.
        env.link = () => {
            count += 1;
        };
        // Since there are no intrinsics at all, env.link should never get called.
        linkIntrinsics(env, {});

        expect(count).toBe(0);
    });
});
