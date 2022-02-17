/* eslint-disable no-throw-literal, no-new, class-methods-use-this */
import createVirtualEnvironment from '@locker/near-membrane-dom';

class ExoticObject {
    constructor(source) {
        Object.assign(this, source);
    }
}

describe('Freezing', () => {
    describe('before creating the sandbox', () => {
        it('should be observed from within the sandbox', () => {
            // expect.assertions(10);
            window.bar = { a: 1, b: 2 };
            Object.freeze(window.bar);
            const env = createVirtualEnvironment(window, window);
            // checking the state of bar in the blue realm
            expect(Object.isExtensible(window.bar)).toBe(false);
            expect(Object.isSealed(window.bar)).toBe(true);
            expect(Object.isFrozen(window.bar)).toBe(true);
            // checking the state of bar in the sandbox
            env.evaluate(`
                expect(Object.isExtensible(window.bar)).toBe(false);
                expect(Object.isSealed(window.bar)).toBe(true);
                expect(Object.isFrozen(window.bar)).toBe(true);
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
                expect('c' in bar).toBe(false);
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
                }).toThrow();
                expect('c' in bar).toBe(false);
            `);
        });
        it('should be observed from within the sandbox (via endowments)', () => {
            const bar = { a: 1, b: 2 };
            Object.freeze(bar);
            const env = createVirtualEnvironment(window, window, {
                endowments: { bar, expect },
            });
            // checking the state of bar in the blue realm
            expect(Object.isExtensible(bar)).toBe(false);
            expect(Object.isSealed(bar)).toBe(true);
            expect(Object.isFrozen(bar)).toBe(true);
            // checking the state of bar in the sandbox
            env.evaluate(`
                expect(Object.isExtensible(bar)).toBe(false);
                expect(Object.isSealed(bar)).toBe(true);
                expect(Object.isFrozen(bar)).toBe(true);
            `);
            // verifying that in deep it is reflected as frozen
            env.evaluate(`
                'use strict';
                expect(() => {
                    bar.c = 3;
                }).toThrowError(TypeError);
                expect('c' in bar).toBe(false);
                expect(() => {
                    bar.a = 3;
                }).toThrowError(TypeError);
                expect(() => {
                    bar.b = 3;
                }).toThrowError(TypeError);
                expect(bar.a).toBe(1);
                expect(bar.b).toBe(2);
            `);
            expect(bar.a).toBe(1);
            expect(bar.b).toBe(2);
            expect('c' in bar).toBe(false);
        });

        it('should be observed after passing object back and forth', () => {
            expect.assertions(13);
            const tx = {
                ref: null,
            };
            const rx = {
                ref: null,
            };
            const env = createVirtualEnvironment(window, window, {
                endowments: { tx, rx },
            });
            // The value of both tx.ref and rx.ref are initially null, as shown above,
            // verified in sandbox
            env.evaluate(`
                expect(tx.ref).toBe(null);
                expect(rx.ref).toBe(null);
            `);
            // Set the value of tx.ref to a POJO
            tx.ref = {
                a: 1,
            };
            // Verify that the new value of tx.ref is reflected in the sandbox
            // Set the value of rx.ref to the value of tx.ref WITHIN the sandbox
            env.evaluate(`
                expect(tx.ref.a).toBe(1);
                rx.ref = tx.ref;
            `);
            // Verify that the value of rx.ref is reflected back in system mode
            expect(rx.ref.a).toBe(1);
            // Now freeze rx.ref
            Object.freeze(rx.ref);
            // Check that the value of tx.ref is frozen (it's the same as rx.ref)
            expect(Object.isFrozen(tx.ref)).toBe(true);
            // Verify that properties of the value of rx.ref tx.ref cannot be
            // reassigned to new values.
            expect(() => {
                rx.ref.a = 2;
            }).toThrowError(TypeError);
            expect(() => {
                tx.ref.a = 2;
            }).toThrowError(TypeError);
            expect(rx.ref.a).toBe(1);
            expect(tx.ref.a).toBe(1);

            // Return to the sandbox and verify that both tx.ref and rx.ref are frozen.
            env.evaluate(`
                'use strict';
                expect(() => {
                    rx.ref.a = 3;
                }).toThrowError(TypeError);
                expect(() => {
                    tx.ref.a = 3;
                }).toThrowError(TypeError);
                expect(rx.ref.a).toBe(1);
                expect(tx.ref.a).toBe(1);
            `);
        });
    });
    describe('after creating the sandbox', () => {
        it('should not be observed from within the sandbox after mutation of exotic objects', () => {
            expect.assertions(9);
            window.baz = new ExoticObject({ a: 1, b: 2 });
            const env = createVirtualEnvironment(window, window);
            // Check the state of baz in the sandbox.
            env.evaluate(`
                expect(Object.isExtensible(window.baz)).toBe(true);
                expect(Object.isSealed(window.baz)).toBe(false);
                expect(Object.isFrozen(window.baz)).toBe(false);
                baz.mutation = 1; // Mutation makes the proxy static.
            `);
            // Freeze blue baz after being observed by the sandbox.
            Object.freeze(window.baz);
            expect(Object.isExtensible(window.baz)).toBe(false);
            expect(Object.isSealed(window.baz)).toBe(true);
            expect(Object.isFrozen(window.baz)).toBe(true);
            // Verify the state of red baz from within the sandbox.
            env.evaluate(`
                'use strict';
                expect(() => {
                    baz.c = 3;
                }).not.toThrowError();
                expect(baz.c).toBe(3);
            `);
            // Verify the sandboxed expando doesn't leak to blue baz.
            expect('c' in window.baz).toBe(false);
        });
        it('should be observed from within the sandbox after mutation of plain objects', () => {
            expect.assertions(9);
            window.baz = { a: 1, b: 2 };
            const env = createVirtualEnvironment(window, window);
            // Check the state of baz in the sandbox.
            env.evaluate(`
                expect(Object.isExtensible(window.baz)).toBe(true);
                expect(Object.isSealed(window.baz)).toBe(false);
                expect(Object.isFrozen(window.baz)).toBe(false);
                baz.mutation = 1; // Mutation makes the proxy live.
            `);
            // Freeze blue baz after being observed by the sandbox.
            Object.freeze(window.baz);
            expect(Object.isExtensible(window.baz)).toBe(false);
            expect(Object.isSealed(window.baz)).toBe(true);
            expect(Object.isFrozen(window.baz)).toBe(true);
            // Verify the state of red baz from within the sandbox.
            env.evaluate(`
                'use strict';
                expect(() => {
                    baz.c = 3;
                }).toThrowError();
                expect('c' in baz).toBe(false);
            `);
            // Verify the state of blue baz.
            expect('c' in window.baz).toBe(false);
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
            const env = createVirtualEnvironment(window, window);
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
