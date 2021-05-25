import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('The Sandbox', () => {
    it('should allow creation of sandboxed global expandos', () => {
        expect.assertions(3);
        const evalScript = createVirtualEnvironment({ endowments: window });
        evalScript(`
            window.s1 = 'a';
            expect(s1).toBe('a');
        `);
        expect(window.s1).toBe(undefined);
        evalScript(`
            // reusing globals across different eval calls
            expect(s1).toBe('a');
        `);
    });
    it('should allow the shadowing of existing globals', () => {
        expect.assertions(4);
        window.s2 = 'b';
        const evalScript = createVirtualEnvironment({ endowments: window });
        evalScript(`
            expect(s2).toBe('b');
            window.s2 = 'c';
            expect(s2).toBe('c');
        `);
        expect(window.s2).toBe('b');
        evalScript(`
            // reusing global shadows across different eval calls
            expect(s2).toBe('c');
        `);
    });
});
