import { VirtualEnvironment } from '../../types';
import { isIntrinsicGlobalName, linkIntrinsics } from '../intrinsics';

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
        expect.assertions(remappedIntrinsicNames.length);
        remappedIntrinsicNames.forEach((remappedIntrinsicName) => {
            expect(isIntrinsicGlobalName(remappedIntrinsicName)).toBe(false);
        });
    });
    it('should return true for all non-remapped ES global names', () => {
        expect.assertions(intrinsicNames.length);
        intrinsicNames.forEach((intrinsicName) => {
            expect(isIntrinsicGlobalName(intrinsicName)).toBe(true);
        });
    });
});

describe('linkIntrinsics()', () => {
    it('should attempt to link reflective intrinsics that are in the blue realm', () => {
        expect.assertions(2);
        const fakeEnv = ({
            setRefMapEntries: jest.fn(),
        } as unknown) as VirtualEnvironment;
        expect(() => {
            linkIntrinsics(fakeEnv, globalThis, {} as typeof globalThis);
            // We _want_ an error, because we know that redGlobalThis is
            // empty and there for will have nothing to link to; neither
            // will that nothing have a prototype to link to!
        }).toThrow(TypeError);
        expect(fakeEnv.setRefMapEntries).toHaveBeenCalledTimes(1);
    });
    it('should link reflective intrinsics that are in the blue realm to the red realm', () => {
        expect.assertions(3);
        const stopper = new Error('done');
        const fakeEnv = ({
            setRefMapEntries: jest.fn(() => {
                // We only care about this being called once!
                throw stopper;
            }),
        } as unknown) as VirtualEnvironment;
        const fakeRedGlobalThis = ({
            AggregateError: {
                prototype: {},
            },
        } as unknown) as typeof globalThis;

        expect(() => {
            linkIntrinsics(fakeEnv, globalThis, fakeRedGlobalThis);
        }).toThrow(stopper);
        expect(fakeEnv.setRefMapEntries).toHaveBeenCalledTimes(1);
        expect(fakeEnv.setRefMapEntries).toHaveBeenCalledWith(
            fakeRedGlobalThis.AggregateError,
            globalThis.AggregateError
        );
    });
    it('should ignore intrinsics that are not in the blue realm', () => {
        expect.assertions(1);
        const fakeEnv = ({
            setRefMapEntries: jest.fn(),
        } as unknown) as VirtualEnvironment;
        linkIntrinsics(fakeEnv, {} as typeof globalThis, {} as typeof globalThis);
        expect(fakeEnv.setRefMapEntries).not.toHaveBeenCalled();
    });
});
