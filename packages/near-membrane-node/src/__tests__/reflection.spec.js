import createVirtualEnvironment from '../node-realm';

const foo = {
    b() {},
    e: new Error(),
};

describe('Reflective Intrinsic Objects', () => {
    it('should preserve identity of Object thru membrane', () => {
        expect.assertions(2);

        const env = createVirtualEnvironment(globalThis, {
            endowments: Object.getOwnPropertyDescriptors({ expect, foo }),
        });

        env.evaluate(`
            const o = {};
            expect(foo instanceof Object).toBe(true);
            expect(o instanceof Object).toBe(true);
        `);
    });
    it('should preserve identity of Function thru membrane', () => {
        expect.assertions(2);

        const env = createVirtualEnvironment(globalThis, {
            endowments: Object.getOwnPropertyDescriptors({ expect, foo }),
        });

        env.evaluate(`
            function x() {}
            expect(foo.b instanceof Function).toBe(true);
            expect(x instanceof Function).toBe(true);
        `);
    });
    it('should preserve identity of Error thru membrane', () => {
        expect.assertions(2);

        const env = createVirtualEnvironment(globalThis, {
            endowments: Object.getOwnPropertyDescriptors({ expect, foo }),
        });

        env.evaluate(`
            const e = new Error();
            expect(foo.e instanceof Error).toBe(true);
            expect(e instanceof Error).toBe(true);
        `);
    });
});
