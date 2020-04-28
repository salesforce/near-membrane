import { evaluateSourceText } from '../../lib/browser-realm.js';

const endowments = {
    expandable: { x: 1 },
    expect
};

describe('The membrane', () => {
    it('should allow expandos on endowments inside the sandbox', function() {
        // expect.assertions(4);
        evaluateSourceText(`
            expandable.y = 2;
            expect(expandable.y).toBe(2);    
        `, { endowments });
        expect(endowments.expandable.y).toBe(undefined);
        expect(endowments.expandable.x).toBe(1);
    });
});
