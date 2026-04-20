import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('Ensure instrumentation object usage in near-membrane', () => {
    it('Instrumentation object is accepted by createVirtualEnvironment', () => {
        const mockInstrumentation = {
            startActivity: () => ({ stop: () => {}, error: () => {} }),
            log: () => {},
            error: () => {},
        };
        const env = createVirtualEnvironment(window, {
            instrumentation: mockInstrumentation,
        });
        expect(() => env.evaluate('1 + 1')).not.toThrow();
    });
    it('Instrumentation object does not interfere with sandbox operations', () => {
        expect.assertions(2);

        const mockInstrumentation = {
            startActivity: () => ({ stop: () => {}, error: () => {} }),
            log: () => {},
            error: () => {},
        };
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            instrumentation: mockInstrumentation,
        });
        env.evaluate(`
            expect(1 + 2).toBe(3);
            expect(typeof window).toBe('object');
        `);
    });
    it('Instrumentation option works alongside other options', () => {
        expect.assertions(1);

        const mockInstrumentation = {
            startActivity: () => ({ stop: () => {}, error: () => {} }),
            log: () => {},
            error: () => {},
        };
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            instrumentation: mockInstrumentation,
            keepAlive: true,
        });
        env.evaluate(`
            expect(typeof document).not.toBe('undefined');
        `);
    });
});
