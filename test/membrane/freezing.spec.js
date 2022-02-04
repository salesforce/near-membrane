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
