import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('Data', () => {
    it('encodes blobs from typed arrays correctly', (done) => {
        const env = createVirtualEnvironment(window, window, { endowments: { done, expect } });
        env.evaluate(`
            const a = new Uint8Array([97, 98, 99]);
            // Demonstrates that the value is still a number, as expected.
            expect(typeof a[0]).toBe('number');
            expect(typeof a[1]).toBe('number');
            expect(typeof a[2]).toBe('number');

            // As far as I can tell, the type doesn't matter
            const b = new Blob([a], { type: 'application/octet-stream' });

            b.text().then((output) => {
                // Bug: the output is a string "97,98,99"
                expect(output).toBe('abc');
                done();
            });
        `);
    });
    it('creates random values from typed arrays correctly', (done) => {
        const env = createVirtualEnvironment(window, window, { endowments: { done, expect } });
        env.evaluate(`
            expect(() => {
                // If TypedArray constructors are remapped, this code will throw an exception:
                // Crypto.getRandomValues: Argument 1 does not implement interface ArrayBufferView
                crypto.getRandomValues(new Uint32Array(1));
            }).not.toThrow();
            done();
        `);
    });
});
