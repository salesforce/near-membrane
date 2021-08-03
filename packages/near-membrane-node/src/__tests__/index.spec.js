import createVirtualEnvironment from '../node-realm';

describe('VirtualEnvironment', () => {
    describe('default settings', () => {
        it('no options provided', () => {
            const evalScript = createVirtualEnvironment(/* no options */);
            expect(() => evalScript('')).not.toThrow();
        });
        it('empty object provided', () => {
            const evalScript = createVirtualEnvironment({
                /* empty options */
            });
            expect(() => evalScript('')).not.toThrow();
        });
        it('object has endowments, but is undefined', () => {
            let endowments;
            const evalScript = createVirtualEnvironment({ endowments });
            expect(() => evalScript('')).not.toThrow();
        });
        it('object has endowments, but is empty', () => {
            const evalScript = createVirtualEnvironment({ endowments: {} });
            expect(() => evalScript('')).not.toThrow();
        });
    });
    describe('reverse proxies', () => {
        it('should not have identity discontinuity for arrays', () => {
            expect.assertions(6);
            globalThis.blueArrayFactory = (a1, a2) => {
                expect(Array.isArray(a1)).toBe(true);
                expect(a1 instanceof Array).toBe(true);
                expect(a1).toStrictEqual([1, 2]);
                expect(Array.isArray(a2)).toBe(true);
                expect(a2 instanceof Array).toBe(true);
                expect(a2).toStrictEqual([3, 4]);
            };
            const evalScript = createVirtualEnvironment({ endowments: window });
            evalScript(`blueArrayFactory([1, 2], new Array(3, 4))`);
        });
        it('should not have identity discontinuity for objects', () => {
            expect.assertions(6);
            globalThis.blueObjectFactory = (b1, b2) => {
                expect(typeof b1 === 'object').toBe(true);
                expect(b1 instanceof Object).toBe(true);
                expect(b1.x).toBe(1);
                expect(typeof b2 === 'object').toBe(true);
                expect(b2 instanceof Object).toBe(true);
                expect(b2.x).toBe(2);
            };
            const evalScript = createVirtualEnvironment({ endowments: window });
            evalScript(`blueObjectFactory({ x: 1 }, Object.create({}, { x: { value: 2 } }))`);
        });
        it('should reach a writable value descriptor for a function, and set the descriptor value to the appropriate function', () => {
            globalThis.blueFn = (value) => {
                if (value) {
                    const { blueFn } = globalThis;
                    expect(value).toStrictEqual({ blueFn });
                }
            };
            const evalScript = createVirtualEnvironment({ endowments: window });
            evalScript(`blueFn({ blueFn })`);
        });
    });
    describe('red proxies', () => {
        globalThis.foo = {
            a1: [1, 2],
            a2: [3, 4],
            b1: { x: 1 },
            b2: Object.create({}, { x: { value: 2 } }),
        };
        it('should not have identity discontinuity for arrays', () => {
            expect.assertions(6);
            const evalScript = createVirtualEnvironment({ endowments: window });
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
            const evalScript = createVirtualEnvironment({ endowments: window });
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

        globalThis.count = 0;
        globalThis.Constructible = class {
            constructor() {
                expect(globalThis.count).toBe(1);
                globalThis.count = 2;
            }
        };
        it('should invoke the blue hooks construct trap', () => {
            expect.assertions(2);
            const evalScript = createVirtualEnvironment({ endowments: window });
            globalThis.count = 1;
            evalScript(`const c = new Constructible()`);
            expect(globalThis.count).toBe(2);
        });
    });
});
