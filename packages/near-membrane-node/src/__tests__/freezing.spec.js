import createVirtualEnvironment from '../node-realm';

class ExoticObject {
    constructor(source) {
        if (source) {
            Object.defineProperties(this, Object.getOwnPropertyDescriptors(source));
        }
    }
}

describe('Freezing', () => {
    describe('before creating the sandbox', () => {
        it('should be observed from within the sandbox', () => {
            expect.assertions(9);

            globalThis.plainObject = { x: 1 };
            Object.freeze(globalThis.plainObject);

            const env = createVirtualEnvironment(globalThis, {
                globalObjectShape: globalThis,
            });

            // Check the state of plainObject in the blue realm.
            expect(Object.isExtensible(globalThis.plainObject)).toBe(false);
            expect(Object.isSealed(globalThis.plainObject)).toBe(true);
            expect(Object.isFrozen(globalThis.plainObject)).toBe(true);

            // Check the state of plainObject in the sandbox.
            env.evaluate(`
                expect(Object.isExtensible(plainObject)).toBe(false);
                expect(Object.isSealed(plainObject)).toBe(true);
                expect(Object.isFrozen(plainObject)).toBe(true);
            `);
            // Verify that in strict mode it is reflected as frozen.
            env.evaluate(`
                'use strict';
                expect(() => {
                    plainObject.y = 2;
                }).toThrowError(TypeError);
                expect(plainObject).toEqual({ x: 1 });
            `);

            expect(globalThis.plainObject).toEqual({ x: 1 });
        });
    });
    describe('after creating the sandbox', () => {
        it('should not be observed from within the sandbox after mutation of exotic objects', () => {
            expect.assertions(9);

            globalThis.exoticObject = new ExoticObject({ x: 1 });

            const env = createVirtualEnvironment(globalThis, {
                globalObjectShape: globalThis,
            });

            // Check the state of exoticObject in the sandbox.
            env.evaluate(`
                expect(Object.isExtensible(globalThis.exoticObject)).toBe(true);
                expect(Object.isSealed(globalThis.exoticObject)).toBe(false);
                expect(Object.isFrozen(globalThis.exoticObject)).toBe(false);
                exoticObject.y = 2; // Mutation makes the exotic object proxy static.
            `);

            // Freeze blue exoticObject after being observed by the sandbox.
            Object.freeze(globalThis.exoticObject);
            expect(Object.isExtensible(globalThis.exoticObject)).toBe(false);
            expect(Object.isSealed(globalThis.exoticObject)).toBe(true);
            expect(Object.isFrozen(globalThis.exoticObject)).toBe(true);

            // Verify the state of red exoticObject from within the sandbox.
            env.evaluate(`
                'use strict';
                expect(() => {
                    exoticObject.z = 3;
                }).not.toThrowError(TypeError);
                expect({ ...exoticObject }).toEqual({ x: 1, y: 2, z: 3 });
            `);

            // Verify the sandboxed expando doesn't leak to blue exoticObject.
            expect({ ...globalThis.exoticObject }).toEqual({ x: 1 });
        });
        it('should be observed from within the sandbox after mutation of plain objects', () => {
            expect.assertions(9);

            globalThis.plainObject = { x: 1 };

            const env = createVirtualEnvironment(globalThis, {
                globalObjectShape: globalThis,
            });

            // Check the state of plainObject in the sandbox.
            env.evaluate(`
                expect(Object.isExtensible(globalThis.plainObject)).toBe(true);
                expect(Object.isSealed(globalThis.plainObject)).toBe(false);
                expect(Object.isFrozen(globalThis.plainObject)).toBe(false);
                plainObject.y = 2; // Mutation makes the POJO proxy live.
            `);

            // Freeze blue plainObject after being observed by the sandbox.
            Object.freeze(globalThis.plainObject);
            expect(Object.isExtensible(globalThis.plainObject)).toBe(false);
            expect(Object.isSealed(globalThis.plainObject)).toBe(true);
            expect(Object.isFrozen(globalThis.plainObject)).toBe(true);

            // Verify the state of red plainObject from within the sandbox.
            env.evaluate(`
                'use strict';
                expect(() => {
                    plainObject.z = 3;
                }).toThrowError(TypeError);
                expect(plainObject).toEqual({ x: 1, y: 2 });
            `);
            // Verify the state of blue plainObject.
            expect(globalThis.plainObject).toEqual({ x: 1, y: 2 });
        });
    });
    describe('reverse proxies', () => {
        it('can be frozen', () => {
            expect.assertions(10);

            globalThis.takeOutside = (object, func) => {
                // Test blue proxies.
                expect(Object.isFrozen(object)).toBe(false);
                expect(Object.isFrozen(func)).toBe(false);
                Object.freeze(object);
                Object.freeze(func);
                expect(Object.isFrozen(object)).toBe(true);
                expect(Object.isFrozen(func)).toBe(true);
                expect(() => {
                    object.y = 2;
                }).toThrowError(TypeError);
                expect(() => {
                    func.y = 2;
                }).toThrowError(TypeError);
            };

            const env = createVirtualEnvironment(globalThis, {
                globalObjectShape: globalThis,
            });

            env.evaluate(`
                'use strict';
                const object = { x: 1 };
                const func = function() {};
                takeOutside(object, func);
                expect(Object.isFrozen(object)).toBe(true);
                expect(Object.isFrozen(func)).toBe(true);
                expect(() => {
                    object.y = 2;
                }).toThrowError(TypeError);
                expect(() => {
                    func.y = 2;
                }).toThrowError(TypeError);
            `);
        });
    });
});
