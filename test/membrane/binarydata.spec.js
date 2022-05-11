import createVirtualEnvironment from '@locker/near-membrane-dom';

// Safari Technology Preview may not have support for Atomics enabled.
if (typeof Atomics !== 'undefined') {
    describe('Atomics', () => {
        it('operates on atomic-friendly typed arrays', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
            });

            env.evaluate(`
                const ab = new ArrayBuffer(Int32Array.BYTES_PER_ELEMENT );
                const i32a = new Int32Array(ab);
                i32a[0] = 9;
                Atomics.add(i32a, 0, 33); // 42
                Atomics.and(i32a, 0, 1); // 0
                Atomics.exchange(i32a, 0, 42); // 42
                Atomics.or(i32a, 0, 1); // 43
                Atomics.store(i32a, 0, 18); // 18
                Atomics.sub(i32a, 0, 10);
                Atomics.xor(i32a, 0, 1);
                expect(Atomics.load(i32a, 0)).toBe(9);
            `);
        });
    });
}

describe('Blob', () => {
    it('encodes blobs from typed arrays', (done) => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ done, expect }),
        });

        env.evaluate(`
            const a = new Uint8Array([97, 98, 99]);
            const b = new Blob([a], { type: 'application/octet-stream' });
            b.text().then((output) => {
                expect(output).toBe('abc');
                done();
            });
        `);
    });
});

describe('Crypto', () => {
    it('creates random values from typed arrays', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            expect(() => {
                crypto.getRandomValues(new Uint8Array(1));
            }).not.toThrow();
        `);
    });
});

describe('DataView', () => {
    it('should not support index access', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            const buffer = new ArrayBuffer(8);
            const dataView = new DataView(buffer);
            expect(dataView[0]).toBe(undefined);
        `);
    });
});

describe('FileReader', () => {
    it('reads from blobs created from typed arrays', (done) => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ done, expect }),
        });

        env.evaluate(`
            const source = new Uint8Array([97, 98, 99]);
            const blob = new Blob([source]);
            const reader = new FileReader();

            reader.onload = (event) => {
                expect(reader.result.byteLength).toBe(source.length);
                expect(reader.result).toBeInstanceOf(ArrayBuffer);
                done();
            };
            reader.readAsArrayBuffer(blob);
        `);
    });
});

describe('TypedArray', () => {
    it('should support in bound index access', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            const buffer = new ArrayBuffer(8);
            const bigIntTypedArrays = [
                new BigInt64Array(buffer),
                new BigUint64Array(buffer),
            ];
            for (const bigIntTypedArray of bigIntTypedArrays) {
                expect(typeof bigIntTypedArray[0]).toBe('bigint');
            }
            const typedArrays = [
                new Float32Array(buffer),
                new Float64Array(buffer),
                new Int8Array(buffer),
                new Int16Array(buffer),
                new Int32Array(buffer),
                new Uint8Array(buffer),
                new Uint8ClampedArray(buffer),
                new Uint16Array(buffer),
                new Uint32Array(buffer),
            ];
            for (const typedArray of typedArrays) {
                expect(typeof typedArray[0]).toBe('number');
            }
        `);
    });
    it('should support in bound index access with modified prototypes', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            const buffer = new ArrayBuffer(8);
            const typedArrays = [
                new BigInt64Array(buffer),
                new BigUint64Array(buffer),
                new Float32Array(buffer),
                new Float64Array(buffer),
                new Int8Array(buffer),
                new Int16Array(buffer),
                new Int32Array(buffer),
                new Uint8Array(buffer),
                new Uint8ClampedArray(buffer),
                new Uint16Array(buffer),
                new Uint32Array(buffer),
            ];
            for (const typedArray of typedArrays) {
                Reflect.setPrototypeOf(typedArray, { length: 0 });
                expect(typedArray[0]).toBeDefined();
            }
        `);
    });
    it('should support setting in bound index values on subclasses', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            const buffer = new ArrayBuffer(8);
            const Ctors = [
                BigInt64Array,
                BigUint64Array,
                Float32Array,
                Float64Array,
                Int8Array,
                Int16Array,
                Int32Array,
                Uint8Array,
                Uint8ClampedArray,
                Uint16Array,
                Uint32Array,
            ];
            for (const Ctor of Ctors) {
                class Subclass extends Ctor {
                    constructor(arrayBuffer) {
                        super(arrayBuffer);
                        this[0] = this[0];
                    }
                }
                const subclassed = new Subclass(buffer);
                expect(subclassed[0]).toBeDefined();
            }
        `);
    });
    it('should treat out of bound index access as undefined', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            const buffer = new ArrayBuffer(8);
            const typedArrays = [
                new BigInt64Array(buffer),
                new BigUint64Array(buffer),
                new Float32Array(buffer),
                new Float64Array(buffer),
                new Int8Array(buffer),
                new Int16Array(buffer),
                new Int32Array(buffer),
                new Uint8Array(buffer),
                new Uint8ClampedArray(buffer),
                new Uint16Array(buffer),
                new Uint32Array(buffer),
            ];
            for (const typedArray of typedArrays) {
                expect(typedArray[-1]).toBe(undefined);
                expect(typedArray[1000]).toBe(undefined);
            }
        `);
    });
});
