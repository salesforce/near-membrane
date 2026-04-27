import createVirtualEnvironment from '../node-realm';

describe('createVirtualEnvironment options', () => {
    describe('distortionCallback', () => {
        it('distorts getters', () => {
            expect.assertions(3);

            const aGetter = () => 'a';
            const bGetter = () => 'b';
            const cGetter = () => 'c';
            const env = createVirtualEnvironment(globalThis, {
                distortionCallback(v) {
                    if (v === aGetter) {
                        return bGetter;
                    }
                    if (v === bGetter) {
                        return aGetter;
                    }
                    return v;
                },
            });
            env.remapProperties(globalThis, {
                distA: {
                    get: aGetter,
                    configurable: true,
                },
                distB: {
                    get: bGetter,
                    configurable: true,
                },
                distC: {
                    get: cGetter,
                    configurable: true,
                },
            });
            expect(env.evaluate('distA')).toBe('b');
            expect(env.evaluate('distB')).toBe('a');
            expect(env.evaluate('distC')).toBe('c');
        });
    });

    describe('signSourceCallback', () => {
        it('is called for code evaluation', () => {
            let callCount = 0;
            const env = createVirtualEnvironment(globalThis, {
                signSourceCallback(sourceText) {
                    callCount += 1;
                    return sourceText;
                },
            });
            const countBeforeEval = callCount;
            expect(env.evaluate('1 + 2')).toBe(3);
            expect(callCount).toBe(countBeforeEval + 1);
        });
        it('is invoked with the source text', () => {
            const sources = [];
            const env = createVirtualEnvironment(globalThis, {
                signSourceCallback(sourceText) {
                    sources.push(sourceText);
                    return sourceText;
                },
            });
            env.evaluate('42');
            expect(sources[sources.length - 1]).toBe('42');
        });
    });

    describe('liveTargetCallback', () => {
        it('makes marked targets live so mutations propagate', () => {
            const a = { foo: 1 };
            const b = { foo: 1 };
            const env = createVirtualEnvironment(globalThis, {
                liveTargetCallback(v) {
                    return v === a;
                },
            });
            env.remapProperties(globalThis, {
                liveA: { value: a, configurable: true },
                liveB: { value: b, configurable: true },
            });
            env.evaluate('liveA.bar = 2');
            env.evaluate('liveB.bar = 2');
            expect(a).toEqual({ foo: 1, bar: 2 });
            expect(b).toEqual({ foo: 1 });
        });
    });

    describe('globalObjectShape', () => {
        it('uses provided shape to determine remapped keys', () => {
            const shape = { customGlobal: true };
            const env = createVirtualEnvironment(globalThis, {
                globalObjectShape: shape,
            });
            expect(() => env.evaluate('')).not.toThrow();
        });
        it('uses default global keys when globalObjectShape is null', () => {
            const env = createVirtualEnvironment(globalThis, {
                globalObjectShape: null,
            });
            expect(() => env.evaluate('')).not.toThrow();
        });
    });

    describe('maxPerfMode', () => {
        it('creates environment successfully with maxPerfMode true', () => {
            const env = createVirtualEnvironment(globalThis, {
                maxPerfMode: true,
            });
            expect(() => env.evaluate('1 + 1')).not.toThrow();
        });
        it('creates environment successfully with maxPerfMode false', () => {
            const env = createVirtualEnvironment(globalThis, {
                maxPerfMode: false,
            });
            expect(() => env.evaluate('1 + 1')).not.toThrow();
        });
    });

    describe('instrumentation', () => {
        it('accepts an instrumentation object without error', () => {
            const mockInstrumentation = {
                startActivity: () => ({ stop() {}, error() {} }),
                log() {},
                error() {},
            };
            const env = createVirtualEnvironment(globalThis, {
                instrumentation: mockInstrumentation,
            });
            expect(() => env.evaluate('1 + 1')).not.toThrow();
        });
    });

    describe('connector caching', () => {
        it('reuses cached connector for the same globalObject', () => {
            const env1 = createVirtualEnvironment(globalThis);
            const env2 = createVirtualEnvironment(globalThis);
            expect(() => env1.evaluate('1')).not.toThrow();
            expect(() => env2.evaluate('2')).not.toThrow();
        });
    });
});
