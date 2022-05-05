import createVirtualEnvironment from '../node-realm';

describe('createVirtualEnvironment', () => {
    const globalObjectShape = globalThis;
    describe('with default settings', () => {
        describe('throws when', () => {
            it('no globalObject is provided', () => {
                expect(() => createVirtualEnvironment()).toThrow();
            });
        });
        describe('creates an environment when', () => {
            it('no globalObjectShape is provided', () => {
                const env = createVirtualEnvironment(globalThis, { globalObjectShape });
                expect(() => env.evaluate('')).not.toThrow();
            });
            it('no options are provided', () => {
                const env = createVirtualEnvironment(globalThis /* no options */);
                expect(() => env.evaluate('')).not.toThrow();
            });
            it('an empty options object is provided', () => {
                const env = createVirtualEnvironment(globalThis);
                expect(() => env.evaluate('')).not.toThrow();
            });
            it('object has endowments, but is undefined', () => {
                let endowments;
                const env = createVirtualEnvironment(globalThis, { endowments });
                expect(() => env.evaluate('')).not.toThrow();
            });
            it('object has endowments, but is empty', () => {
                const env = createVirtualEnvironment(globalThis, {
                    endowments: {},
                });
                expect(() => env.evaluate('')).not.toThrow();
            });
        });
    });
    describe('reverse proxies', () => {
        it('should not have identity discontinuity for arrays', () => {
            expect.assertions(6);

            const blueArrayFactory = (a1, a2) => {
                expect(Array.isArray(a1)).toBe(true);
                expect(a1 instanceof Array).toBe(true);
                expect(a1).toStrictEqual([1, 2]);
                expect(Array.isArray(a2)).toBe(true);
                expect(a2 instanceof Array).toBe(true);
                expect(a2).toStrictEqual([3, 4]);
            };

            const env = createVirtualEnvironment(globalThis, {
                endowments: Object.getOwnPropertyDescriptors({ blueArrayFactory }),
                globalObjectShape,
            });

            env.evaluate(`blueArrayFactory([1, 2], new Array(3, 4))`);
        });
        it('should not have identity discontinuity for objects', () => {
            expect.assertions(6);

            const blueObjectFactory = (b1, b2) => {
                expect(typeof b1 === 'object').toBe(true);
                expect(b1 instanceof Object).toBe(true);
                expect(b1.x).toBe(1);
                expect(typeof b2 === 'object').toBe(true);
                expect(b2 instanceof Object).toBe(true);
                expect(b2.x).toBe(2);
            };

            const env = createVirtualEnvironment(globalThis, {
                endowments: Object.getOwnPropertyDescriptors({ blueObjectFactory }),
            });

            env.evaluate(`blueObjectFactory({ x: 1 }, Object.create({}, { x: { value: 2 } }))`);
        });
        it('should reach a writable value descriptor for a function, and set the descriptor value to the appropriate function', () => {
            const o = {};
            o.blueFn = (value) => {
                if (value) {
                    const { blueFn } = o;
                    expect(value).toStrictEqual({ blueFn });
                }
            };

            const env = createVirtualEnvironment(globalThis, {
                endowments: Object.getOwnPropertyDescriptors({ o }),
                globalObjectShape,
            });

            env.evaluate(`let {blueFn} = o; o.blueFn({ blueFn })`);
        });
    });
    describe('red proxies', () => {
        it('should not have identity discontinuity for arrays', () => {
            expect.assertions(6);

            const foo = {
                a1: [1, 2],
                a2: [3, 4],
                b1: { x: 1 },
                b2: Object.create({}, { x: { value: 2 } }),
            };

            const env = createVirtualEnvironment(globalThis, {
                endowments: Object.getOwnPropertyDescriptors({ expect, foo }),
            });

            env.evaluate(`
                const { a1, a2 } = foo;
                expect(Array.isArray(a1)).toBe(true);
                expect(a1 instanceof Array).toBe(true);
                expect(a1).toStrictEqual([1, 2]);
                expect(Array.isArray(a2)).toBe(true);
                expect(a2 instanceof Array).toBe(true);
                expect(a2).toStrictEqual([3, 4]);
            `);
        });
        it('should not have identity discontinuity for objects', () => {
            expect.assertions(6);

            const foo = {
                a1: [1, 2],
                a2: [3, 4],
                b1: { x: 1 },
                b2: Object.create({}, { x: { value: 2 } }),
            };

            const env = createVirtualEnvironment(globalThis, {
                endowments: Object.getOwnPropertyDescriptors({ expect, foo }),
            });

            env.evaluate(`
                const { b1, b2 } = foo;
                expect(typeof b1 === 'object').toBe(true);
                expect(b1 instanceof Object).toBe(true);
                expect(b1.x).toBe(1);
                expect(typeof b2 === 'object').toBe(true);
                expect(b2 instanceof Object).toBe(true);
                expect(b2.x).toBe(2);
            `);
        });

        it('should invoke the blue hooks construct trap', () => {
            expect.assertions(2);

            let count = 0;
            const Constructible = class {
                constructor() {
                    expect(count).toBe(1);
                    count = 2;
                }
            };

            const env = createVirtualEnvironment(globalThis, {
                endowments: Object.getOwnPropertyDescriptors({ count, Constructible, expect }),
            });

            count = 1;

            env.evaluate(`const c = new Constructible()`);

            expect(count).toBe(2);
        });
    });
});
