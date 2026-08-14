import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('Security boundary', () => {
    // Regression: W-23789302. The variadic apply/construct trap
    // (createApplyOrConstructTrapForAnyNumberOfArgs) marshals a 6+-argument
    // cross-boundary call into a combined-args array. If it populated that array
    // with `[[Set]]` (`combinedArgs[i] = value`) instead of `[[DefineOwnProperty]]`,
    // sandboxed (red) code could install an inherited numeric setter on
    // `Array.prototype` that fires mid-marshal and overwrites already-placed slots --
    // including `combinedArgs[0]`, the foreign target pointer. Because the first user
    // argument is marshalled into `combinedArgs[2]`, a setter on `Array.prototype['2']`
    // can copy that argument's pointer over index 0 and redirect the call to a
    // different blue callable. These tests exercise a REAL cross-realm boundary
    // (iframe realm via createVirtualEnvironment); the fix must hold end-to-end.
    describe('inherited Array.prototype setter cannot corrupt marshalled args (W-23789302)', () => {
        const NUMERIC_SETTER_KEY = '2';

        afterEach(() => {
            // Defensive: ensure the polluting accessor never leaks between specs even
            // if a test body throws before its own cleanup runs.
            delete Array.prototype[NUMERIC_SETTER_KEY];
        });

        it('does not redirect a 6-arg call to a different blue target', () => {
            expect.assertions(1);

            // Two distinct blue callables. `intended` is the nominal target; `redirect`
            // is what the attacker's setter would divert the call to by stomping the
            // target pointer at combinedArgs[0] with the first user arg's pointer.
            const intended = (...args) => `intended:${args.length}`;
            const redirect = () => 'REDIRECTED';
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ intended, redirect }),
            });

            // Sandboxed code pollutes Array.prototype[2] so that setting index 2 of any
            // inheriting array overwrites index 0 with the value being set (mirrors the
            // locker hasFocus PoC), then calls the intended blue target with 6 args --
            // routing through the variadic trap -- passing `redirect` as the first arg
            // (which lands at combinedArgs[2]).
            const result = env.evaluate(`
                Object.defineProperty(Array.prototype, '${NUMERIC_SETTER_KEY}', {
                    configurable: true,
                    set(pointer) {
                        Object.defineProperty(this, '0', { value: pointer, configurable: true });
                        Object.defineProperty(this, '2', { value: 'x', configurable: true });
                    },
                });
                try {
                    intended(redirect, 'b', 'c', 'd', 'e', 'f');
                } finally {
                    delete Array.prototype['${NUMERIC_SETTER_KEY}'];
                }
            `);

            // With the fix the intended target ran with its six args. Without it the call
            // is redirected to `redirect` (returns 'REDIRECTED') -- a proven escape vector.
            expect(result).toBe('intended:6');
        });

        it('delivers 6 unmangled arguments to the blue target', () => {
            expect.assertions(1);

            // Report each argument's identity back across the boundary; the setter, if it
            // fired, would replace index 0's value and stomp index 2.
            const collect = (...args) =>
                args.map((a) => (typeof a === 'object' ? a.tag : a)).join(',');
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ collect }),
            });

            const result = env.evaluate(`
                const mk = (t) => ({ tag: t });
                Object.defineProperty(Array.prototype, '${NUMERIC_SETTER_KEY}', {
                    configurable: true,
                    set(pointer) {
                        Object.defineProperty(this, '0', { value: pointer, configurable: true });
                        Object.defineProperty(this, '2', { value: 'HACKED', configurable: true });
                    },
                });
                try {
                    collect(mk('a'), mk('b'), mk('c'), mk('d'), mk('e'), mk('f'));
                } finally {
                    delete Array.prototype['${NUMERIC_SETTER_KEY}'];
                }
            `);

            expect(result).toBe('a,b,c,d,e,f');
        });

        it('does not redirect a 6-arg construct (new) to a different blue target', () => {
            expect.assertions(1);

            // The construct trap is built from the SAME variadic factory
            // (createApplyOrConstructTrapForAnyNumberOfArgs) as the apply trap, so a
            // `new` call with 6+ args flows through the identical combinedArgs marshalling.
            // Here combinedArgs[1] carries the newTarget rather than a thisArg, but the
            // corruption vector is unchanged: the inherited setter still overwrites
            // combinedArgs[0] (the target pointer), redirecting which constructor runs.
            function Intended(...args) {
                this.who = 'intended';
                this.count = args.length;
            }
            function Redirect() {
                this.who = 'REDIRECTED';
            }
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ Intended, Redirect }),
            });

            const result = env.evaluate(`
                Object.defineProperty(Array.prototype, '${NUMERIC_SETTER_KEY}', {
                    configurable: true,
                    set(pointer) {
                        Object.defineProperty(this, '0', { value: pointer, configurable: true });
                        Object.defineProperty(this, '2', { value: 'x', configurable: true });
                    },
                });
                try {
                    const instance = new Intended(Redirect, 'b', 'c', 'd', 'e', 'f');
                    instance.who + ':' + instance.count;
                } finally {
                    delete Array.prototype['${NUMERIC_SETTER_KEY}'];
                }
            `);

            // With the fix, the intended constructor ran with its six args. Without it,
            // the setter diverts construction to `Redirect` (yielding 'REDIRECTED').
            expect(result).toBe('intended:6');
        });
    });

    describe('prototype poisoning resistance', () => {
        it('membrane evaluate returns values correctly after Object.keys is replaced post-creation', () => {
            const env = createVirtualEnvironment(window);
            const originalKeys = Object.keys;
            Object.keys = function () {
                throw new Error('poisoned keys');
            };
            try {
                const result = env.evaluate('typeof Object.keys');
                expect(result).toBe('function');
            } finally {
                Object.keys = originalKeys;
            }
        });
        it('captured references in toSafeArray survive prototype pollution', () => {
            const env = createVirtualEnvironment(window);
            const result = env.evaluate('1 + 1');
            expect(result).toBe(2);
        });
    });

    describe('signSourceCallback as security gate', () => {
        it('transforms source text before evaluation', () => {
            expect.assertions(1);

            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
                signSourceCallback(sourceText) {
                    return sourceText;
                },
            });
            env.evaluate(`
                expect(1 + 1).toBe(2);
            `);
        });
        it('can wrap source text', () => {
            expect.assertions(2);

            let signCalled = false;
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
                signSourceCallback(sourceText) {
                    signCalled = true;
                    return sourceText;
                },
            });
            env.evaluate(`
                expect(1 + 1).toBe(2);
            `);
            expect(signCalled).toBe(true);
        });
    });

    describe('revokedProxyCallback edge cases', () => {
        it('callback returning false allows access', () => {
            expect.assertions(1);

            const obj = { value: 42 };
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect, obj }),
                keepAlive: true,
            });
            env.evaluate(`
                expect(obj.value).toBe(42);
            `);
        });
    });

    describe('proxy trap invariant enforcement', () => {
        it('non-configurable properties are reported correctly', () => {
            expect.assertions(2);

            const obj = {};
            Object.defineProperty(obj, 'fixed', {
                value: 'immutable',
                configurable: false,
                writable: false,
                enumerable: true,
            });
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect, obj }),
            });
            env.evaluate(`
                const desc = Object.getOwnPropertyDescriptor(obj, 'fixed');
                expect(desc.configurable).toBe(false);
                expect(desc.value).toBe('immutable');
            `);
        });
        it('frozen object invariants are maintained', () => {
            expect.assertions(3);

            const frozen = Object.freeze({ x: 1, y: 2 });
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect, frozen }),
            });
            env.evaluate(`
                expect(Object.isFrozen(frozen)).toBe(true);
                expect(frozen.x).toBe(1);
                expect(frozen.y).toBe(2);
            `);
        });
        it('sealed object invariants are maintained', () => {
            expect.assertions(2);

            const sealed = Object.seal({ a: 1 });
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect, sealed }),
            });
            env.evaluate(`
                expect(Object.isSealed(sealed)).toBe(true);
                expect(sealed.a).toBe(1);
            `);
        });
    });

    describe('cross-realm object graph isolation', () => {
        it('objects created in red realm cannot access blue globalThis directly', () => {
            expect.assertions(1);

            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
            });
            env.evaluate(`
                const obj = {};
                expect(typeof obj).toBe('object');
            `);
        });
        it('red realm has its own Object constructor', () => {
            expect.assertions(1);

            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
            });
            env.evaluate(`
                const obj = {};
                expect(obj instanceof Object).toBe(true);
            `);
        });
        it('blue functions called from red receive blue arguments', () => {
            expect.assertions(2);

            const blueCheck = (arg) => {
                expect(typeof arg).toBe('object');
                expect(arg.data).toBe('hello');
            };
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ blueCheck }),
            });
            env.evaluate(`
                blueCheck({ data: 'hello' });
            `);
        });
        it('errors thrown in sandbox are instances of blue Error', () => {
            const env = createVirtualEnvironment(window);
            try {
                env.evaluate('throw new TypeError("sandbox error")');
            } catch (e) {
                expect(e instanceof TypeError).toBe(true);
                expect(e.message).toBe('sandbox error');
            }
        });
    });

    describe('error boundary', () => {
        it('catches errors from blue getters accessed from red', () => {
            expect.assertions(1);

            const obj = {};
            Object.defineProperty(obj, 'trap', {
                get() {
                    throw new Error('getter trap');
                },
                configurable: true,
            });
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect, obj }),
            });
            env.evaluate(`
                try {
                    // eslint-disable-next-line no-unused-expressions
                    obj.trap;
                } catch (e) {
                    expect(e.message).toBe('getter trap');
                }
            `);
        });
        it('catches errors from blue setters accessed from red', () => {
            expect.assertions(1);

            const obj = {};
            Object.defineProperty(obj, 'trap', {
                set() {
                    throw new Error('setter trap');
                },
                configurable: true,
            });
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect, obj }),
            });
            env.evaluate(`
                try {
                    obj.trap = 1;
                } catch (e) {
                    expect(e.message).toBe('setter trap');
                }
            `);
        });
    });
});
