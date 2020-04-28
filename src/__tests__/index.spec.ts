import { evaluateScriptSource } from '../node-realm';

const endowments = {
    expect,
};

describe('SecureEnvironment', () => {
    describe('reverse proxies', () => {
        it('should not have identity discontinuity for arrays', function() {
            expect.assertions(6);
            (endowments as any).blueArrayFactory = function (a1: any, a2: any) {
                expect(Array.isArray(a1)).toBe(true);
                expect(a1 instanceof Array).toBe(true);
                expect(a1).toStrictEqual([1, 2]);
                expect(Array.isArray(a2)).toBe(true);
                expect(a2 instanceof Array).toBe(true);
                expect(a2).toStrictEqual([3, 4]);
            }
            evaluateScriptSource(`blueArrayFactory([1, 2], new Array(3, 4))`, { endowments });
        });
        it('should not have identity discontinuity for objects', function() {
            expect.assertions(6);
            (endowments as any).blueObjectFactory = function (b1: any, b2: any) {
                expect(typeof b1 === 'object').toBe(true);
                expect(b1 instanceof Object).toBe(true);
                expect(b1.x).toBe(1);
                expect(typeof b2 === 'object').toBe(true);
                expect(b2 instanceof Object).toBe(true);
                expect(b2.x).toBe(2);
            }
            evaluateScriptSource(`blueObjectFactory({ x: 1 }, Object.create({}, { x: { value: 2 } }))`, { endowments });
        });
    });
    describe('red proxies', () => {
        (endowments as any).foo = {
            a1: [1, 2],
            a2: new Array(3, 4),
            b1: { x: 1 },
            b2: Object.create({}, { x: { value: 2 } }),
        };
        it('should not have identity discontinuity for arrays', function() {
            expect.assertions(6);
            evaluateScriptSource(`
                const { a1, a2 } = foo;
                expect(Array.isArray(a1)).toBe(true);
                expect(a1 instanceof Array).toBe(true);
                expect(a1).toStrictEqual([1, 2]);
                expect(Array.isArray(a2)).toBe(true);
                expect(a2 instanceof Array).toBe(true);
                expect(a2).toStrictEqual([3, 4]);
            `, { endowments });
        });
        it('should not have identity discontinuity for objects', function() {
            expect.assertions(6);
            evaluateScriptSource(`
                const { b1, b2 } = foo;
                expect(typeof b1 === 'object').toBe(true);
                expect(b1 instanceof Object).toBe(true);
                expect(b1.x).toBe(1);
                expect(typeof b2 === 'object').toBe(true);
                expect(b2 instanceof Object).toBe(true);
                expect(b2.x).toBe(2);
            `, { endowments });
        });
    });
});
