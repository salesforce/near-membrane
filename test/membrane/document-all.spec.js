import createSecureEnvironment from '@locker/near-membrane-dom';

describe('document.all', () => {
    it('should preserve the typeof it since it is a common test for older browsers', function() {
        // expect.assertions(2);
        const evalScript = createSecureEnvironment({ endowments: window });
        expect(typeof document.all).toBe("undefined");
        evalScript(`
            expect(typeof document.all).toBe("undefined");
        `);
    });
    it('should disable the feature entirely inside the sandbox', function() {
        // expect.assertions(1);
        const evalScript = createSecureEnvironment({ endowments: window });
        evalScript(`
            expect(document.all === undefined).toBeTrue();
        `);
    });
});
