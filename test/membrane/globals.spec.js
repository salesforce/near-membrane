import { evaluateSourceText } from '../../lib/browser-realm.js';

const endowments = {
    expect,
};

describe('The Sandbox', () => {
    it('should allow creation of sandboxed global expandos', function() {
        // expect.assertions(3);
        evaluateSourceText(`
            window.s1 = 'a';
            expect(s1).toBe('a'); // broken in safari for detached iframes   
        `, { endowments });
        expect(window.s1).toBe(undefined);
        expect(endowments.s1).toBe(undefined);
    });
    it('should allow the shadowing of existing globals', function() {
        // expect.assertions(4);
        endowments.s2 = 'b';
        evaluateSourceText(`
            expect(s2).toBe('b');
            window.s2 = 'c';
            expect(s2).toBe('c');    
        `, { endowments });
        expect(window.s2).toBe(undefined);
        expect(endowments.s2).toBe('b');
    });
});
