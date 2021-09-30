/* eslint-disable no-throw-literal, no-new, class-methods-use-this */
import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('Freezing', () => {
    describe('before creating the sandbox', () => {
        it('should be observed from within the sandbox', () => {
            // expect.assertions(10);
            window.bar = { a: 1, b: 2 };
            Object.freeze(window.bar);
            const evalScript = createVirtualEnvironment(window);
            // checking the state of bar in the blue realm
            expect(Object.isExtensible(window.bar)).toBe(false);
            expect(Object.isSealed(window.bar)).toBe(true);
            expect(Object.isFrozen(window.bar)).toBe(true);
            // checking the state of bar in the sandbox
            evalScript(`
                expect(Object.isExtensible(window.bar)).toBe(false);
                expect(Object.isSealed(window.bar)).toBe(true);
                expect(Object.isFrozen(window.bar)).toBe(true);
            `);
            // verifying that in deep it is reflected as frozen
            evalScript(`
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
            // // verifying that when observed from outside, it is still reflected
            evalScript(`
                'use strict';
                let error = null;
                try {
                    bar.c = 3; // because it is frozen
                } catch (e) {
                    error = e;
                }
                expect(() => {
                    bar.c = 3;
                }).toThrow();
                expect(bar.c).toBe(undefined);
            `);
        });
    });
    describe('after creating the sandbox', () => {
        it('should not be observed from within the sandbox after a mutation', () => {
            expect.assertions(9);
            window.baz = { a: 1, b: 2 };
            const evalScript = createVirtualEnvironment(window);
            // checking the state of bar in the sandbox
            evalScript(`
                expect(Object.isExtensible(window.baz)).toBe(true);
                expect(Object.isSealed(window.baz)).toBe(false);
                expect(Object.isFrozen(window.baz)).toBe(false);
                baz.mutation = 1; // this makes the proxy static via snapshot
            `);
            // freezing the blue value after being observed by the sandbox
            Object.freeze(window.baz);
            expect(Object.isExtensible(window.baz)).toBe(false);
            expect(Object.isSealed(window.baz)).toBe(true);
            expect(Object.isFrozen(window.baz)).toBe(true);
            // verifying the state of the obj from within the sandbox
            evalScript(`
                'use strict';
                expect(() => {
                    baz.c = 3;
                }).not.toThrowError();
                expect(baz.c).toBe(3);
            `);
            // because it is a sandboxed expando that doesn't leak out
            expect(window.baz.c).toBe(undefined);
        });
    });
    describe('reverse proxies', () => {
        it('can be freeze', () => {
            expect.assertions(8);
            window.blueObjectFactory = (o, f) => {
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
            const evalScript = createVirtualEnvironment(window);
            evalScript(`
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
