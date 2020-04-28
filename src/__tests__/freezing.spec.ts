import { evaluateScriptSource } from '../node-realm';

const endowments = {
    expect,
}

describe('Freezing', () => {
    describe('before creating the sandbox', () => {
        it('should be observed from within the sandbox', function() {
            expect.assertions(10);
            (endowments as any).bar = { a: 1, b: 2 };
            Object.freeze((endowments as any).bar)
            // checking the state of bar in the blue realm
            expect(Object.isExtensible((endowments as any).bar)).toBe(false);
            expect(Object.isSealed((endowments as any).bar)).toBe(true);
            expect(Object.isFrozen((endowments as any).bar)).toBe(true);
            // checking the state of bar in the sandbox
            evaluateScriptSource(`
                expect(Object.isExtensible(globalThis.bar)).toBe(false);
                expect(Object.isSealed(globalThis.bar)).toBe(true);
                expect(Object.isFrozen(globalThis.bar)).toBe(true);
            `, { endowments });
            // verifying that in deep it is reflected as frozen
            evaluateScriptSource(`
                'use strict';
                let isTypeError = false;
                try {
                    bar.c = 3; // because it is frozen
                } catch (e) {
                    isTypeError = e instanceof TypeError;
                }
                expect(isTypeError).toBe(true);
                expect(bar.c).toBe(undefined);
            `, { endowments });
            // verifying that when observed from outside, it is still reflected
            evaluateScriptSource(`
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
            `, { endowments });
        });
    });
    describe('after creating the sandbox', () => {
        it('should not be observed from within the sandbox', function() {
            expect.assertions(9);
            (endowments as any).baz = { a:1, b: 2 };
            let callback = () => undefined;
            (endowments as any).callbackAfterFreezing = (cb) => {
                callback = cb;
            }
            // checking the state of bar in the sandbox
            evaluateScriptSource(`
                expect(Object.isExtensible(globalThis.baz)).toBe(true);
                expect(Object.isSealed(globalThis.baz)).toBe(false);
                expect(Object.isFrozen(globalThis.baz)).toBe(false);
                callbackAfterFreezing(() => {
                    expect(() => {
                        baz.c = 3;
                    }).not.toThrowError();
                    expect(baz.c).toBe(3);
                });
            `, { endowments });
            // freezing the blue value after being observed by the sandbox
            Object.freeze((endowments as any).baz);
            expect(Object.isExtensible((endowments as any).baz)).toBe(false);
            expect(Object.isSealed((endowments as any).baz)).toBe(true);
            expect(Object.isFrozen((endowments as any).baz)).toBe(true);
            // verifying the state of the obj from within the sandbox
            callback();
            expect((endowments as any).baz.c).toBe(undefined); // because it is a sandboxed expando that doesn't leak out
        });
    });
    describe('reverse proxies', () => {
        it('can be freeze', () => {
            expect.assertions(8);
            (endowments as any).blueObjectFactory = function (o: any, f: () => void) {
                expect(Object.isFrozen(o)).toBe(false);
                expect(Object.isFrozen(f)).toBe(false);
                Object.freeze(o);
                Object.freeze(f);
                expect(Object.isFrozen(o)).toBe(true);
                expect(Object.isFrozen(f)).toBe(true);
                expect(() => {
                    o.z = 3;
                }).toThrowError();
            }
            evaluateScriptSource(`
                'use strict';
                const o = { x: 1 };
                const f = function() {};
                blueObjectFactory(o, f);
                expect(Object.isFrozen(o)).toBe(true);
                expect(Object.isFrozen(f)).toBe(true);
                expect(() => {
                    o.z = 3;
                }).toThrowError();
            `, { endowments });
        });
    });
});
