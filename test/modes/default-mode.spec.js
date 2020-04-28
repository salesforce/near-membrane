import { evaluateSourceText } from '../../lib/browser-realm.js';

const endowments = {
    foo: 1,
    expect,
};

describe('Inline Mode', () => {
    it('should support endowments', function() {
        // expect.assertions(1);
        evaluateSourceText(`
            expect(foo).toBe(1);
        `, {
            endowments
        });
    });
    it('should detach the iframe before executing the code', function() {
        // expect.assertions(2);
        evaluateSourceText(`
            expect(top).toBe(null);
            // FF uses '', others set it to undefined or null
            expect(location.host == null || location.host === '').toBe(true);
        `, {
            endowments
        });
    });
});
