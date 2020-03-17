import createSecureEnvironment from '../../lib/browser-realm.js';

describe('document.all', () => {
    it('should change the value of its yellow typeof from "undefined" to "object"', function() {
        // expect.assertions(2);
        const evalScript = createSecureEnvironment();
        expect(typeof document.all).toBe("undefined");
        evalScript(`
            // observable difference between a regular dom and a sandboxed dom
            expect(typeof document.all).toBe("object");
        `);
    });
    it('should work throughout the membrane', function() {
        // expect.assertions(3);
        const evalScript = createSecureEnvironment();
        evalScript(`
            expect(document.all.length > 1).toBeTrue();
            expect(document.all[0].ownerDocument).toBe(document); // comparison in red
            expect(document.all[0].ownerDocument === document).toBeTrue(); // comparison in yellow
        `);
    });
});
