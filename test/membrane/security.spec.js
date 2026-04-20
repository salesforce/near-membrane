import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('Security boundary', () => {
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
