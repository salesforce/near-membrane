import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('document.all', () => {
    it('should preserve the typeof it since it is a common test for older browsers', () => {
        expect.assertions(2);
        const env = createVirtualEnvironment(window, window);
        expect(typeof document.all).toBe('undefined');
        env.evaluate(`
            expect(typeof document.all).toBe("undefined");
        `);
    });
    it('should disable the feature entirely inside the sandbox', () => {
        expect.assertions(1);
        const env = createVirtualEnvironment(window, window);
        env.evaluate(`
            expect(document.all === undefined).toBeTrue();
        `);
    });
});
