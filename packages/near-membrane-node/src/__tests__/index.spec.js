import createVirtualEnvironment from '../node-realm';

describe('VirtualEnvironment', () => {
    describe('default settings', () => {
        it('no options provided', () => {
            const evalScript = createVirtualEnvironment(globalThis /* no options */);
            expect(() => evalScript('')).not.toThrow();
        });
        it('empty object provided', () => {
            const evalScript = createVirtualEnvironment(globalThis, {});
            expect(() => evalScript('')).not.toThrow();
        });
        it('object has endowments, but is undefined', () => {
            let endowments;
            const evalScript = createVirtualEnvironment(globalThis, { endowments });
            expect(() => evalScript('')).not.toThrow();
        });
        it('object has endowments, but is empty', () => {
            const evalScript = createVirtualEnvironment(globalThis, { endowments: {} });
            expect(() => evalScript('')).not.toThrow();
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
            const evalScript = createVirtualEnvironment(globalThis, {
                endowments: { blueArrayFactory },
            });
            evalScript(`blueArrayFactory([1, 2], new Array(3, 4))`);
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
            const evalScript = createVirtualEnvironment(globalThis, {
                endowments: { blueObjectFactory },
            });
            evalScript(`blueObjectFactory({ x: 1 }, Object.create({}, { x: { value: 2 } }))`);
        });
        it('should reach a writable value descriptor for a function, and set the descriptor value to the appropriate function', () => {
            const o = {};
            o.blueFn = (value) => {
                if (value) {
                    const { blueFn } = o;
                    expect(value).toStrictEqual({ blueFn });
                }
            };
            const evalScript = createVirtualEnvironment(globalThis, {
                endowments: { o },
            });
            evalScript(`let {blueFn} = o; o.blueFn({ blueFn })`);
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
            const evalScript = createVirtualEnvironment(globalThis, {
                endowments: { expect, foo },
            });
            evalScript(`
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
            const evalScript = createVirtualEnvironment(globalThis, {
                endowments: { expect, foo },
            });
            evalScript(`
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
            let count = 0;
            const Constructible = class {
                constructor() {
                    expect(count).toBe(1);
                    count = 2;
                }
            };
            expect.assertions(2);
            const evalScript = createVirtualEnvironment(globalThis, {
                endowments: { count, Constructible, expect },
            });
            count = 1;
            evalScript(`const c = new Constructible()`);
            expect(count).toBe(2);
        });
    });
});
