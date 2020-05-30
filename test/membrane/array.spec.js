import createSecureEnvironment from '../../lib/browser-realm.js';

const blue = [1, 2, 3];

let red;
function saveFoo(arg) {
    red = arg;
}

describe('arrays', () => {
    it('should preserve the length behavior across the membrane', () => {
        const evalScript = createSecureEnvironment(undefined, { blue, saveFoo, expect });
        evalScript(`
            saveFoo(['a', 'b', 'c']);
            expect(blue.length).toBe(3);
            expect(blue[2]).toBe(3);
            blue[3] = 4;
            expect(blue.length).toBe(4);
            expect(blue[3]).toBe(4);
        `);
        // the blue mutation from red realm should not leak into blue realm
        expect(blue.length).toBe(3);
        expect(blue[3]).toBe(undefined);
        // mutating red from blue realm
        expect(red.length).toBe(3);
        expect(red[2]).toBe('c');
        red[3] = 'd';
        expect(red.length).toBe(4);
        expect(red[3]).toBe('d');
    });
});
