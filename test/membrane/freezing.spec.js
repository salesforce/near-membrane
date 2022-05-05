import createVirtualEnvironment from '@locker/near-membrane-dom';

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

            window.plainObject = { x: 1 };
            Object.freeze(window.plainObject);

            const env = createVirtualEnvironment(window, {
                // Provides plainObject
                globalObjectShape: window,
            });

            // Check the state of plainObject in the blue realm.
            expect(Object.isExtensible(window.plainObject)).toBe(false);
            expect(Object.isSealed(window.plainObject)).toBe(true);
            expect(Object.isFrozen(window.plainObject)).toBe(true);

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

            expect(window.plainObject).toEqual({ x: 1 });
        });
        it('should be observed from within the sandbox (via endowments)', () => {
            expect.assertions(9);

            const plainObject = { x: 1 };
            Object.freeze(plainObject);

            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect, plainObject }),
            });

            // Check the state of plainObject in the blue realm.
            expect(Object.isExtensible(plainObject)).toBe(false);
            expect(Object.isSealed(plainObject)).toBe(true);
            expect(Object.isFrozen(plainObject)).toBe(true);

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

            expect(plainObject).toEqual({ x: 1 });
        });
        it('should be observed after passing an object back and forth', () => {
            expect.assertions(11);

            const receiveX = {
                ref: null,
            };

            const transmitX = {
                ref: null,
            };

            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ receiveX, transmitX }),
                // Provides expect
                globalObjectShape: window,
            });

            env.evaluate(`
                expect(transmitX.ref).toBe(null);
                expect(receiveX.ref).toBe(null);
            `);

            // Set the value of transmitX.ref to a POJO.
            transmitX.ref = {
                x: 1,
            };

            // Verify that the POJO of transmitX.ref is reflected in the sandbox.
            // Set the value of receiveX.ref to the value of transmitX.ref WITHIN
            // the sandbox.
            env.evaluate(`
                expect(transmitX.ref.x).toBe(1);
                receiveX.ref = transmitX.ref;
            `);

            // Verify that the value of receiveX.ref is reflected in system mode.
            expect(receiveX.ref).toBe(transmitX.ref);
            Object.freeze(receiveX.ref);
            // Check that ref is frozen.
            expect(Object.isFrozen(transmitX.ref)).toBe(true);
            // Verify that properties of ref cannot be assigned new values.
            expect(() => {
                receiveX.ref.x = 2;
            }).toThrowError(TypeError);
            expect(receiveX.ref.x).toBe(1);
            expect(transmitX.ref.x).toBe(1);

            // Return to the sandbox and verify that ref is frozen.
            env.evaluate(`
                'use strict';
                expect(() => {
                    transmitX.ref.x = 3;
                }).toThrowError(TypeError);
                expect(receiveX.ref).toEqual({ x: 1 });
                expect(transmitX.ref).toEqual({ x: 1 });
            `);
        });
    });
    describe('after creating the sandbox', () => {
        it('should not be observed from within the sandbox after mutation of exotic objects', () => {
            expect.assertions(9);

            window.exoticObject = new ExoticObject({ x: 1 });

            const env = createVirtualEnvironment(window, {
                // Provides exoticObject & expect
                globalObjectShape: window,
            });

            // Check the state of exoticObject in the sandbox.
            env.evaluate(`
                expect(Object.isExtensible(window.exoticObject)).toBe(true);
                expect(Object.isSealed(window.exoticObject)).toBe(false);
                expect(Object.isFrozen(window.exoticObject)).toBe(false);
                exoticObject.y = 2; // Mutation makes the exotic object proxy static.
            `);

            // Freeze blue exoticObject after being observed by the sandbox.
            Object.freeze(window.exoticObject);
            expect(Object.isExtensible(window.exoticObject)).toBe(false);
            expect(Object.isSealed(window.exoticObject)).toBe(true);
            expect(Object.isFrozen(window.exoticObject)).toBe(true);

            // Verify the state of red exoticObject from within the sandbox.
            env.evaluate(`
                'use strict';
                expect(() => {
                    exoticObject.z = 3;
                }).not.toThrowError(TypeError);
                expect({ ...exoticObject }).toEqual({ x: 1, y: 2, z: 3 });
            `);

            // Verify the sandboxed expando doesn't leak to blue exoticObject.
            expect({ ...window.exoticObject }).toEqual({ x: 1 });
        });
        it('should be observed from within the sandbox after mutation of plain objects', () => {
            expect.assertions(9);

            window.plainObject = { x: 1 };

            const env = createVirtualEnvironment(window, {
                // Provides plainObject & expect
                globalObjectShape: window,
            });

            // Check the state of plainObject in the sandbox.
            env.evaluate(`
                expect(Object.isExtensible(window.plainObject)).toBe(true);
                expect(Object.isSealed(window.plainObject)).toBe(false);
                expect(Object.isFrozen(window.plainObject)).toBe(false);
                plainObject.y = 2; // Mutation makes the POJO proxy live.
            `);

            // Freeze blue plainObject after being observed by the sandbox.
            Object.freeze(window.plainObject);
            expect(Object.isExtensible(window.plainObject)).toBe(false);
            expect(Object.isSealed(window.plainObject)).toBe(true);
            expect(Object.isFrozen(window.plainObject)).toBe(true);

            // Verify the state of red plainObject from within the sandbox.
            env.evaluate(`
                'use strict';
                expect(() => {
                    plainObject.z = 3;
                }).toThrowError(TypeError);
                expect(plainObject).toEqual({ x: 1, y: 2 });
            `);

            // Verify the state of blue plainObject.
            expect(window.plainObject).toEqual({ x: 1, y: 2 });
        });
    });
    describe('reverse proxies', () => {
        it('can be frozen', () => {
            expect.assertions(10);

            window.takeOutside = (object, func) => {
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

            const env = createVirtualEnvironment(window, {
                // Provides takeOutside & expect
                globalObjectShape: window,
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
    describe('non-freezing objects', () => {
        it('should not throw for exotic objects', () => {
            expect.assertions(3);

            const exoticObject = new Proxy(new ExoticObject({ x: 1 }), {
                preventExtensions() {
                    return false;
                },
            });

            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({
                    exoticObject,
                    expect,
                }),
            });

            env.evaluate(`
                'use strict';
                expect(() => {
                    Object.freeze(exoticObject);
                }).not.toThrow();
                expect(() => {
                    exoticObject.x = 2;
                }).toThrowError(TypeError);
                expect({ ...exoticObject }).toEqual({ x: 1 });
            `);
        });
        it('should throw for plain objects', () => {
            expect.assertions(3);

            const plainObject = new Proxy(
                { x: 1 },
                {
                    preventExtensions() {
                        return false;
                    },
                }
            );
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({
                    expect,
                    plainObject,
                }),
            });

            env.evaluate(`
                'use strict';
                expect(() => {
                    Object.freeze(plainObject);
                }).toThrowError(TypeError);
                expect(() => {
                    plainObject.x = 2;
                }).not.toThrow();
                expect(plainObject).toEqual({ x: 2 });
            `);
        });
    });
});
