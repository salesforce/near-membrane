import createVirtualEnvironment from '../node-realm';

describe('Reflective Intrinsic Objects', () => {
    const foo = {
        b() {},
        e: new Error(),
    };

    it('should preserve identity of Object thru membrane', () => {
        expect.assertions(2);
        const evalScript = createVirtualEnvironment(globalThis, { endowments: { expect, foo } });
        evalScript(`
            const o = {};
            expect(foo instanceof Object).toBe(true);
            expect(o instanceof Object).toBe(true);
        `);
    });
    it('should preserve identity of Function thru membrane', () => {
        expect.assertions(2);
        const evalScript = createVirtualEnvironment(globalThis, { endowments: { expect, foo } });
        evalScript(`
            function x() {}
            expect(foo.b instanceof Function).toBe(true);
            expect(x instanceof Function).toBe(true);
        `);
    });
    it('should preserve identity of Error thru membrane', () => {
        expect.assertions(2);
        const evalScript = createVirtualEnvironment(globalThis, { endowments: { expect, foo } });
        evalScript(`
            const e = new Error();
            expect(foo.e instanceof Error).toBe(true);
            expect(e instanceof Error).toBe(true);
        `);
    });
});
