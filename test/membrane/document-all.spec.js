import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('document.all', () => {
    it('should preserve the typeof it since it is a common test for older browsers', () => {
        expect.assertions(2);
        const evalScript = createVirtualEnvironment(window);
        expect(typeof document.all).toBe('undefined');
        evalScript(`
            expect(typeof document.all).toBe("undefined");
        `);
    });
    it('should disable the feature entirely inside the sandbox', () => {
        expect.assertions(1);
        const evalScript = createVirtualEnvironment(window);
        evalScript(`
            expect(document.all === undefined).toBeTrue();
        `);
    });
});
