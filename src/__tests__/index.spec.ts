import createSecureEnvironment from '../node-realm';

describe('SecureEnvironment', () => {
    describe('.constructor', () => {
        it('should not have identity discontinuity for arrays', function() {
            expect.assertions(6);
            (globalThis as any).outerArrayFactory = function (a1: any, a2: any) {
                expect(Array.isArray(a1)).toBe(true);
                expect(a1 instanceof Array).toBe(true);
                expect(a1).toStrictEqual([1, 2]);
                expect(Array.isArray(a2)).toBe(true);
                expect(a2 instanceof Array).toBe(true);
                expect(a2).toStrictEqual([3, 4]);
            }
            const secureGlobalThis = createSecureEnvironment((v) => v);
            secureGlobalThis.eval(`outerArrayFactory([1, 2], new Array(3, 4))`);
        });
        it('should not have identity discontinuity for objects', function() {
            expect.assertions(6);
            (globalThis as any).outerObjectFactory = function (a1: any, a2: any) {
                expect(typeof a1 === 'object').toBe(true);
                expect(a1 instanceof Object).toBe(true);
                expect(a1.x).toBe(1);
                expect(typeof a2 === 'object').toBe(true);
                expect(a2 instanceof Object).toBe(true);
                expect(a2.x).toBe(2);
            }
            const secureGlobalThis = createSecureEnvironment((v) => v);
            secureGlobalThis.eval(`outerObjectFactory({ x: 1 }, { x: 2 })`);
        });
    });
});
