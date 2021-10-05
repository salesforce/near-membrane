import createVirtualEnvironment from '../node-realm';

describe('Freezing', () => {
    describe('before creating the sandbox', () => {
        it('should be observed from within the sandbox', () => {
            expect.assertions(10);
            globalThis.bar = { a: 1, b: 2 };
            Object.freeze(globalThis.bar);
            const env = createVirtualEnvironment(globalThis);
            // checking the state of bar in the blue realm
            expect(Object.isExtensible(globalThis.bar)).toBe(false);
            expect(Object.isSealed(globalThis.bar)).toBe(true);
            expect(Object.isFrozen(globalThis.bar)).toBe(true);
            // checking the state of bar in the sandbox
            env.evaluate(`
                expect(Object.isExtensible(globalThis.bar)).toBe(false);
                expect(Object.isSealed(globalThis.bar)).toBe(true);
                expect(Object.isFrozen(globalThis.bar)).toBe(true);
            `);
            // verifying that in deep it is reflected as frozen
            env.evaluate(`
                'use strict';
                let isTypeError = false;
                try {
                    bar.c = 3; // because it is frozen
                } catch (e) {
                    isTypeError = e instanceof TypeError;
                }
                expect(isTypeError).toBe(true);
                expect(bar.c).toBe(undefined);
            `);
            // verifying that when observed from outside, it is still reflected
            env.evaluate(`
                'use strict';
                let error = null;
                try {
                    bar.c = 3; // because it is frozen
                } catch (e) {
                    error = e;
                }
                expect(() => {
                    bar.c = 3;
                }).toThrow(TypeError);
                expect(bar.c).toBe(undefined);
            `);
        });
    });
    describe('after creating the sandbox', () => {
        it('should not be observed from within the sandbox after a mutation', () => {
            expect.assertions(9);
            globalThis.baz = { a: 1, b: 2 };
            const env = createVirtualEnvironment(globalThis);
            // checking the state of bar in the sandbox
            env.evaluate(`
                expect(Object.isExtensible(globalThis.baz)).toBe(true);
                expect(Object.isSealed(globalThis.baz)).toBe(false);
                expect(Object.isFrozen(globalThis.baz)).toBe(false);
                baz.mutation = 1; // this makes the proxy static via snapshot
            `);
            // freezing the blue value after being observed by the sandbox
            Object.freeze(globalThis.baz);
            expect(Object.isExtensible(globalThis.baz)).toBe(false);
            expect(Object.isSealed(globalThis.baz)).toBe(true);
            expect(Object.isFrozen(globalThis.baz)).toBe(true);
            // verifying the state of the obj from within the sandbox
            env.evaluate(`
                'use strict';
                expect(() => {
                    baz.c = 3;
                }).not.toThrowError();
                expect(baz.c).toBe(3);
            `);
            // because it is a sandboxed expando that doesn't leak out
            expect(globalThis.baz.c).toBe(undefined);
        });
    });
    describe('reverse proxies', () => {
        it('can be freeze', () => {
            expect.assertions(8);
            globalThis.blueObjectFactory = (o, f) => {
                expect(Object.isFrozen(o)).toBe(false);
                expect(Object.isFrozen(f)).toBe(false);
                Object.freeze(o);
                Object.freeze(f);
                expect(Object.isFrozen(o)).toBe(true);
                expect(Object.isFrozen(f)).toBe(true);
                expect(() => {
                    o.z = 3;
                }).toThrowError();
            };
            const env = createVirtualEnvironment(globalThis);
            env.evaluate(`
                'use strict';
                const o = { x: 1 };
                const f = function() {};
                blueObjectFactory(o, f);
                expect(Object.isFrozen(o)).toBe(true);
                expect(Object.isFrozen(f)).toBe(true);
                expect(() => {
                    o.z = 3;
                }).toThrowError();
            `);
        });
    });
});
