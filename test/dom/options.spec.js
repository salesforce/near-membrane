import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('DOM-specific options', () => {
    describe('options.globalObjectShape', () => {
        it('accepts a custom globalObjectShape', () => {
            const env = createVirtualEnvironment(window, {
                globalObjectShape: window,
            });
            expect(() => env.evaluate('')).not.toThrow();
        });
        it('works with a minimal shape object', () => {
            const env = createVirtualEnvironment(window, {
                globalObjectShape: { customProp: true },
            });
            expect(() => env.evaluate('')).not.toThrow();
        });
        it('defaults to null when not provided', () => {
            const env = createVirtualEnvironment(window, {
                globalObjectShape: null,
            });
            expect(() => env.evaluate('')).not.toThrow();
        });
    });

    describe('options.maxPerfMode', () => {
        it('creates environment with maxPerfMode true', () => {
            const env = createVirtualEnvironment(window, {
                maxPerfMode: true,
            });
            expect(() => env.evaluate('1 + 1')).not.toThrow();
        });
        it('creates environment with maxPerfMode false', () => {
            const env = createVirtualEnvironment(window, {
                maxPerfMode: false,
            });
            expect(() => env.evaluate('1 + 1')).not.toThrow();
        });
        it('TypedArrays work with maxPerfMode true', () => {
            expect.assertions(1);

            const env = createVirtualEnvironment(window, {
                maxPerfMode: true,
                endowments: Object.getOwnPropertyDescriptors({ expect }),
            });
            env.evaluate(`
                const arr = new Uint8Array([1, 2, 3]);
                expect(arr.length).toBe(3);
            `);
        });
    });
});
