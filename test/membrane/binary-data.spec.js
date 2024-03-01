import createVirtualEnvironment from '@locker/near-membrane-dom';

function createEnvironmentThatAlwaysRemapsTypedArray() {
    const alwayRemapping = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ expect, OuterUint8Array: Uint8Array }),
    });

    alwayRemapping.evaluate(`
        const u8a = new Uint8Array();
        expect(u8a instanceof OuterUint8Array).toBe(true);
    `);
}
// Safari Technology Preview may not have support for Atomics enabled.
if (typeof Atomics !== 'undefined') {
    describe('Atomics', () => {
        beforeEach(createEnvironmentThatAlwaysRemapsTypedArray);

        it('operates on atomic-friendly typed arrays', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
            });

            env.evaluate(`
                const ab = new ArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
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

        it('fails to operate on atomic-friendly typed arrays, when typed arrays are not remapped', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
                remapTypedArrays: false,
            });

            expect(() =>
                env.evaluate(`
                const ab = new ArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
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
            `)
            ).toThrow();
        });
    });
}

describe('Blob', () => {
    beforeEach(createEnvironmentThatAlwaysRemapsTypedArray);

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
    it('fails to encode blobs from typed arrays, when typed arrays are not remapped', () => {
        const env = createVirtualEnvironment(window, {
            remapTypedArrays: false,
        });

        env.evaluate(`
            const a = new Uint8Array([97, 98, 99]);
            const b = new Blob([a], { type: 'application/octet-stream' });
        `);
    });
});

describe('Crypto', () => {
    beforeEach(createEnvironmentThatAlwaysRemapsTypedArray);

    it('creates random values from typed arrays', (done) => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ done, expect }),
        });

        env.evaluate(`
            expect(() => {
                crypto.getRandomValues(new Uint8Array(1));
            }).not.toThrow();
            async function f() {
                const algorithm = { name: "RSA-OAEP" };
                const data = new Uint8Array([255]);
                const keyPair = await window.crypto.subtle.generateKey(
                  {
                    name: "RSA-OAEP",
                    modulusLength: 4096,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-256",
                  },
                  true,
                  ["encrypt", "decrypt"],
                );

                const encrypted = await crypto.subtle.encrypt(
                  algorithm,
                  keyPair.publicKey,
                  data
                );

                const decrypted = await crypto.subtle.decrypt(
                  algorithm,
                  keyPair.privateKey,
                  encrypted
                );
            }

            f().then(done);
        `);
    });
    it('creates random values from typed arrays, when typed arrays are not remapped', (done) => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ done, expect }),
            remapTypedArrays: false,
        });

        env.evaluate(`
            expect(() => {
                crypto.getRandomValues(new Uint8Array(1));
            }).not.toThrow();
            async function f() {
                const algorithm = { name: "RSA-OAEP" };
                const data = new Uint8Array([255]);
                const keyPair = await window.crypto.subtle.generateKey(
                  {
                    name: "RSA-OAEP",
                    modulusLength: 4096,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-256",
                  },
                  true,
                  ["encrypt", "decrypt"],
                );

                const encrypted = await crypto.subtle.encrypt(
                  algorithm,
                  keyPair.publicKey,
                  data
                );

                const decrypted = await crypto.subtle.decrypt(
                  algorithm,
                  keyPair.privateKey,
                  encrypted
                );
            }

            f().then(done);
        `);
    });
    it('ignores the presense of crypto in endowments if remapTypedArrays is false', (done) => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ Crypto, crypto, done, expect }),
            remapTypedArrays: false,
        });

        env.evaluate(`
            expect(() => {
                crypto.getRandomValues(new Uint8Array(1));
            }).not.toThrow();
            async function f() {
                const algorithm = { name: "RSA-OAEP" };
                const data = new Uint8Array([255]);
                const keyPair = await window.crypto.subtle.generateKey(
                  {
                    name: "RSA-OAEP",
                    modulusLength: 4096,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-256",
                  },
                  true,
                  ["encrypt", "decrypt"],
                );

                const encrypted = await crypto.subtle.encrypt(
                  algorithm,
                  keyPair.publicKey,
                  data
                );

                const decrypted = await crypto.subtle.decrypt(
                  algorithm,
                  keyPair.privateKey,
                  encrypted
                );
            }

            f().then(done);
        `);
    });
});

describe('DataView', () => {
    beforeEach(createEnvironmentThatAlwaysRemapsTypedArray);

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
    it('should not support index access, when typed arrays are not remapped', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            remapTypedArrays: false,
        });

        env.evaluate(`
            const buffer = new ArrayBuffer(8);
            const dataView = new DataView(buffer);
            expect(dataView[0]).toBe(undefined);
        `);
    });
});

describe('FileReader', () => {
    beforeEach(createEnvironmentThatAlwaysRemapsTypedArray);

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
    it('reads from blobs created from typed arrays, when typed arrays are not remapped', (done) => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ done, expect }),
            remapTypedArrays: false,
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
    beforeEach(createEnvironmentThatAlwaysRemapsTypedArray);

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
    it('should support in bound index access, when typed arrays are not remapped', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            remapTypedArrays: false,
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
    it('should support in bound index access with modified prototypes, when typed arrays are not remapped', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            remapTypedArrays: false,
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
    it('should support setting in bound index values on subclasses, when typed arrays are not remapped', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            remapTypedArrays: false,
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
    it('should treat out of bound index access as undefined, when typed arrays are not remapped', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            remapTypedArrays: false,
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
    it('should support subarray method', () => {
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
                expect(() => typedArray.subarray(0)).not.toThrow();
            }
        `);
    });
    it('should support subarray method, when typed arrays are not remapped', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            remapTypedArrays: false,
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
                expect(() => typedArray.subarray(0)).not.toThrow();
            }
        `);
    });
});

describe('URL', () => {
    beforeEach(createEnvironmentThatAlwaysRemapsTypedArray);

    it('can create an svg blob url', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            const createUrl = (type, content) => {
                const blob = new Blob([content], { type });
                return URL.createObjectURL(blob);
            };

            const content = \`
                <svg id="rectangle" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" height="100">
                <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="blue" />
                </svg>\`;

            expect(() => {
                createUrl('image/svg+xml', content);
            }).not.toThrow();
        `);
    });
    it('can create an svg blob url, when typed arrays are not remapped', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            remapTypedArrays: false,
        });
        env.evaluate(`
            const createUrl = (type, content) => {
                const blob = new Blob([content], { type });
                return URL.createObjectURL(blob);
            };

            const content = \`
                <svg id="rectangle" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" height="100">
                <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="blue" />
                </svg>\`;

            expect(() => {
                createUrl('image/svg+xml', content);
            }).not.toThrow();
        `);
    });

    it('can create an html blob url', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            const createUrl = (type, content) => {
                const blob = new Blob([content], { type });
                return URL.createObjectURL(blob);
            };

            expect(() => {
                createUrl('text/html', '<h1>Hello World</h1>')
            }).not.toThrow();
        `);
    });
    it('can create an html blob url, when typed arrays are not remapped', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            remapTypedArrays: false,
        });
        env.evaluate(`
            const createUrl = (type, content) => {
                const blob = new Blob([content], { type });
                return URL.createObjectURL(blob);
            };

            expect(() => {
                createUrl('text/html', '<h1>Hello World</h1>')
            }).not.toThrow();
        `);
    });

    it('can create an xml blob url', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            const createUrl = (type, content) => {
                const blob = new Blob([content], { type });
                return URL.createObjectURL(blob);
            };

            expect(() => {
                expect(() => createUrl('text/xml', '<div><span>foo</span></div>')).not.toThrow();
            }).not.toThrow();
        `);
    });
    it('can create an xml blob url, when typed arrays are not remapped', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            remapTypedArrays: false,
        });
        env.evaluate(`
            const createUrl = (type, content) => {
                const blob = new Blob([content], { type });
                return URL.createObjectURL(blob);
            };

            expect(() => {
                expect(() => createUrl('text/xml', '<div><span>foo</span></div>')).not.toThrow();
            }).not.toThrow();
        `);
    });

    it('can create a File blob url', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            const f = new File(
                ['<p>PEW</p><script src="http://localhost:9876/resource/test"></script>'],
                'foo.txt'
            );
            URL.createObjectURL(f);
        `);
    });
    it('can create a File blob url, when typed arrays are not remapped', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            remapTypedArrays: false,
        });
        env.evaluate(`
            const f = new File(
                ['<p>PEW</p><script src="http://localhost:9876/resource/test"></script>'],
                'foo.txt'
            );
            URL.createObjectURL(f);
        `);
    });
});

