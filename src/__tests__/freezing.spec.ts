import createSecureEnvironment from '../node-realm';

describe('Freezing', () => {
    describe('before creating the sandbox', () => {
        it('should be observed from within the sandbox', function() {
            expect.assertions(10);
            globalThis.bar = { a: 1, b: 2 };
            Object.freeze(globalThis.bar)
            const evalScript = createSecureEnvironment();
            // checking the state of bar in the outer realm
            expect(Object.isExtensible(globalThis.bar)).toBe(false);
            expect(Object.isSealed(globalThis.bar)).toBe(true);
            expect(Object.isFrozen(globalThis.bar)).toBe(true);
            // checking the state of bar in the sandbox
            evalScript(`
                expect(Object.isExtensible(globalThis.bar)).toBe(false);
                expect(Object.isSealed(globalThis.bar)).toBe(true);
                expect(Object.isFrozen(globalThis.bar)).toBe(true);
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
            // verifying that when observed from outside, it is still reflected
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
                }).toThrow(TypeError);
                expect(bar.c).toBe(undefined);
            `);
        });
    });
    describe('after creating the sandbox', () => {
        it('should not be observed from within the sandbox', function() {
            expect.assertions(9);
            globalThis.baz = { a:1, b: 2 };
            const evalScript = createSecureEnvironment();
            // checking the state of bar in the sandbox
            evalScript(`
                expect(Object.isExtensible(globalThis.baz)).toBe(true);
                expect(Object.isSealed(globalThis.baz)).toBe(false);
                expect(Object.isFrozen(globalThis.baz)).toBe(false);
            `);
            // freezing the raw value after being observed by the sandbox
            Object.freeze(globalThis.baz);
            expect(Object.isExtensible(globalThis.baz)).toBe(false);
            expect(Object.isSealed(globalThis.baz)).toBe(true);
            expect(Object.isFrozen(globalThis.baz)).toBe(true);
            // verifying the state of the obj from within the sandbox
            evalScript(`
                'use strict';
                expect(() => {
                    baz.c = 3;
                }).not.toThrowError();
                expect(baz.c).toBe(3);
            `);
            expect(globalThis.baz.c).toBe(undefined); // because it is a sandboxed expando that doesn't leak out
        });
    });
    describe('reverse proxies', () => {
        it('should be frozen', () => {
            expect.assertions(4);
            globalThis.outerObjectFactory = function (o: any, f: () => void) {
                expect(Object.isFrozen(o)).toBe(true);
                expect(Object.isFrozen(Object.getOwnPropertyDescriptor(o, 'y')!.get)).toBe(true);
                expect(Object.isFrozen(f)).toBe(true);
                expect(() => {
                    o.z = 3;
                }).toThrowError();
            }
            const evalScript = createSecureEnvironment();
            evalScript(`outerObjectFactory({ x: 1, get y() { return 2 } }, function() {})`);
        });
    });
});
