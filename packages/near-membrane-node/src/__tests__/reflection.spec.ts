import createVirtualEnvironment from '../node-realm';

globalThis.foo = {
    b() {},
    e: new Error(),
};

describe('Reflective Intrinsic Objects', () => {
    it('should preserve identity of Object thru membrane', function() {
        expect.assertions(2);
        const evalScript = createVirtualEnvironment({ endowments: window });
        evalScript(`
            const o = {};
            expect(foo instanceof Object).toBe(true);
            expect(o instanceof Object).toBe(true);
        `);
    });
    it('should preserve identity of Function thru membrane', function() {
        expect.assertions(2);
        const evalScript = createVirtualEnvironment({ endowments: window });
        evalScript(`
            function x() {}
            expect(foo.b instanceof Function).toBe(true);
            expect(x instanceof Function).toBe(true);
        `);
    });
    it('should preserve identity of Error thru membrane', function() {
        expect.assertions(2);
        const evalScript = createVirtualEnvironment({ endowments: window });
        evalScript(`
            const e = new Error();
            expect(foo.e instanceof Error).toBe(true);
            expect(e instanceof Error).toBe(true);
        `);
    });
});
