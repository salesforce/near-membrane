import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('TypedArray', () => {
    // Safari Technology Preview may not have support for Atomics enabled.
    if (typeof Atomics !== 'undefined') {
        describe('Atomics', () => {
            it('operates on atomic-friendly typed arrays', (done) => {
                const env = createVirtualEnvironment(window, {
                    endowments: Object.getOwnPropertyDescriptors({ done, expect }),
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
                    done();
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
        it('creates random values from typed arrays', (done) => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ done, expect }),
            });

            env.evaluate(`
                expect(() => {
                    crypto.getRandomValues(new Uint8Array(1));
                }).not.toThrow();
                done();
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

                reader.onload = event => {
                    expect(reader.result.byteLength).toBe(source.length);
                    expect(reader.result).toBeInstanceOf(ArrayBuffer);
                    done();
                };
                reader.readAsArrayBuffer(blob);
            `);
        });
    });
});
