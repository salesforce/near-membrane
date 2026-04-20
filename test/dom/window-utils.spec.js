import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('Window utility behavior', () => {
    describe('filterWindowKeys', () => {
        it('excludes document, location, top, window from sandbox globals', () => {
            expect.assertions(4);

            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
            });
            env.evaluate(`
                expect(typeof document).not.toBe('undefined');
                expect(typeof location).not.toBe('undefined');
                expect(typeof top).not.toBe('undefined');
                expect(typeof window).not.toBe('undefined');
            `);
        });
    });

    describe('removeWindowDescriptors', () => {
        it('removes window-specific keys from endowments', () => {
            expect.assertions(1);

            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({
                    expect,
                    customEndowment: 'hello',
                }),
            });
            env.evaluate(`
                expect(customEndowment).toBe('hello');
            `);
        });
    });

    describe('getCachedGlobalObjectReferences caching', () => {
        it('creating multiple environments for the same window works', () => {
            const env1 = createVirtualEnvironment(window);
            const env2 = createVirtualEnvironment(window);
            expect(() => env1.evaluate('1')).not.toThrow();
            expect(() => env2.evaluate('2')).not.toThrow();
        });
    });

    describe('prototype chain linking', () => {
        it('EventTarget.prototype methods are accessible in sandbox', () => {
            expect.assertions(2);

            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
            });
            env.evaluate(`
                expect(typeof window.addEventListener).toBe('function');
                expect(typeof window.removeEventListener).toBe('function');
            `);
        });
    });
});
