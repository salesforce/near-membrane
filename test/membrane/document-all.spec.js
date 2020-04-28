import { evaluateSourceText } from '../../lib/browser-realm.js';

const endowments = {
    expect
};

describe('document.all', () => {
    it('should preserve the typeof it since it is a common test for older browsers', function() {
        // expect.assertions(2);
        expect(typeof document.all).toBe("undefined");
        evaluateSourceText(`
            expect(typeof document.all).toBe("undefined");
        `, { endowments });
    });
    it('should disable the feature entirely inside the sandbox', function() {
        // expect.assertions(1);
        evaluateSourceText(`
            expect(document.all === undefined).toBeTrue();
        `, { endowments });
    });
});
