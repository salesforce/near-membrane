// @ts-nocheck
import {
    createBlueConnector,
    createRedConnector,
    VirtualEnvironment,
} from '../../dist/index.mjs.js';

const { toString: ObjectProtoToString } = Object.prototype;

function getToStringTag(object) {
    return ObjectProtoToString.call(object).slice(8, -1);
}

describe('VirtualEnvironment', () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('VirtualEnvironment.prototype.constructor', () => {
        it('throws when options is missing', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new VirtualEnvironment();
            }).toThrow();
        });

        describe('options.distortionCallback', () => {
            it('distorts getters', () => {
                const aGetter = () => 'a';
                const bGetter = () => 'b';
                const cGetter = () => 'c';
                const env = new VirtualEnvironment({
                    blueConnector: createBlueConnector(globalThis),
                    redConnector: createRedConnector(globalThis.eval),
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
                env.link('globalThis');
                env.remapProperties(globalThis, {
                    a: {
                        get: aGetter,
                        configurable: true,
                    },
                    b: {
                        get: bGetter,
                        configurable: true,
                    },
                    c: {
                        get: cGetter,
                        configurable: true,
                    },
                });
                expect(globalThis.a).toBe('b');
                expect(globalThis.b).toBe('a');
                expect(globalThis.c).toBe('c');
                delete globalThis.a;
                delete globalThis.b;
                delete globalThis.c;
            });
        });

        describe('options.revokedProxyCallback', () => {
            it('treats relevant object as revoked', () => {
                const a = { foo: 1 };
                const b = { foo: 1 };
                const env = new VirtualEnvironment({
                    blueConnector: createBlueConnector(globalThis),
                    redConnector: createRedConnector(globalThis.eval),
                    revokedProxyCallback(v) {
                        return v === a;
                    },
                });
                env.link('globalThis');
                env.remapProperties(globalThis, {
                    a: {
                        value: a,
                        configurable: true,
                    },
                    b: {
                        value: b,
                        configurable: true,
                    },
                });
                expect(() => env.evaluate('a.foo')).toThrow();
                expect(() => env.evaluate('b.foo')).not.toThrow();
                delete globalThis.a;
                delete globalThis.b;
            });
        });

        describe('options.signSourceCallback', () => {
            it('is called for code evaluation', () => {
                let count = 0;
                const env = new VirtualEnvironment({
                    blueConnector: createBlueConnector(globalThis),
                    redConnector: createRedConnector(globalThis.eval),
                    signSourceCallback(sourceText) {
                        count += 1;
                        return sourceText;
                    },
                });
                expect(env.evaluate('1 + 2')).toBe(3);
                expect(count).toBe(1);
            });
        });
    });

    describe('VirtualEnvironment.prototype.evaluate', () => {
        it("calls through to the red realm's callable evaluation function", () => {
            expect.assertions(1);

            const env = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
            });
            const sourceTextToEvaluate = '"Hello!"';
            env.redCallableEvaluate = (sourceText) => {
                expect(sourceText).toBe(sourceTextToEvaluate);
            };
            env.evaluate(sourceTextToEvaluate);
        });
        it('throws pushed error from blue target', () => {
            const env = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
            });
            expect(() => {
                env.evaluate('foo');
            }).toThrow('foo is not defined');
        });
        it('rethrows if blue target does not have pushed error', () => {
            const env = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
            });
            const ExpectedError = class extends Error {};
            const error = new ExpectedError();
            env.redCallableEvaluate = () => {
                throw error;
            };
            env.blueGetSelectedTarget = () => undefined;
            expect(() => {
                env.evaluate('foo');
            }).toThrow(error);
        });
        it('returns result of evaluated expression', () => {
            const env = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
            });
            expect(env.evaluate('["a"]')).toEqual(['a']);
            expect(env.evaluate('true')).toBe(true);
            expect(env.evaluate('false')).toBe(false);
            expect(getToStringTag(env.evaluate('(function a(){})'))).toBe('Function');
            expect(getToStringTag(env.evaluate('(async ()=>{})'))).toBe('AsyncFunction');
            expect(getToStringTag(env.evaluate('(function * (){})'))).toBe('GeneratorFunction');
            expect(getToStringTag(env.evaluate('(async function * (){})'))).toBe(
                'AsyncGeneratorFunction'
            );
            expect(getToStringTag(env.evaluate('new Date()'))).toBe('Date');
            expect(env.evaluate('({ a: 1 })')).toEqual({ a: 1 });
            expect(env.evaluate('1 + 2')).toBe(3);
            expect(getToStringTag(env.evaluate('/a/'))).toBe('RegExp');
            expect(env.evaluate('"Hello!"')).toBe('Hello!');
        });
    });

    describe('VirtualEnvironment.prototype.remapProperties', () => {
        it('does not skip index-like properties', () => {
            const env = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
                liveTargetCallback() {
                    return true;
                },
            });
            const redValue = {};
            env.remapProperties(redValue, Object.getOwnPropertyDescriptors({ 0: 'foo' }));
            expect(Object.getOwnPropertyNames(redValue)).toEqual(['0']);
        });
        it('skips untamable properties, ie. descriptor is not configurable', () => {
            const env = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
            });
            const redValue = {};
            Object.defineProperty(redValue, 'a', {
                value: 0,
                configurable: false,
            });
            env.remapProperties(redValue, Object.getOwnPropertyDescriptors({ a: 1 }));
            expect(redValue.a).toBe(0);
        });
        it('calls an endowment getter', () => {
            expect.assertions(3);

            let count = 0;
            const env = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
                distortionCallback(v) {
                    expect(v()).toBe(1);
                    return v;
                },
            });
            env.link('globalThis');
            env.remapProperties(globalThis, {
                d: {
                    get() {
                        count += 1;
                        return 1;
                    },
                    configurable: true,
                },
            });
            expect(globalThis.d).toBe(1);
            expect(count).toBe(2);
            delete globalThis.d;
        });
        it('calls an endowment setter', () => {
            let blueSetValue = null;
            const env = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
            });
            env.link('globalThis');
            env.remapProperties(globalThis, {
                e: {
                    get() {
                        return blueSetValue;
                    },
                    set(v: any) {
                        blueSetValue = v;
                    },
                    configurable: true,
                },
            });
            globalThis.e = 99;
            expect(blueSetValue).toBe(99);
            globalThis.e = 100;
            expect(blueSetValue).toBe(100);
            delete globalThis.e;
        });
    });

    describe('VirtualEnvironment.prototype.remapProto', () => {
        it('calls `blueGetTransferableValue` for `target` and `proto` arguments', () => {
            expect.assertions(2);

            const env = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
            });
            const a = {};
            const b = {};
            const calledWith = [];
            env.blueGetTransferableValue = (target: any) => {
                calledWith.push(target);
                return target;
            };
            env.redCallableSetPrototypeOf = (targetPointer: any, protoPointerOrNull: any) => {
                expect(targetPointer).toBe(calledWith[0]);
                expect(protoPointerOrNull).toBe(calledWith[1]);
            };
            env.remapProto(a, b);
        });
        it('calls through to redCallableSetPrototypeOf without stubbing', () => {
            const env = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
            });
            const target = {};
            const proto = { marker: true };
            expect(() => env.remapProto(target, proto)).not.toThrow();
        });
        it('passes null proto through to redCallableSetPrototypeOf', () => {
            const env = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
            });
            const target = {};
            expect(() => env.remapProto(target, null)).not.toThrow();
        });
    });

    describe('VirtualEnvironment.prototype.link', () => {
        it('links a single property key', () => {
            const env = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
            });
            globalThis.linkTestSingle = { value: 42 };
            expect(() => env.link('linkTestSingle')).not.toThrow();
            delete globalThis.linkTestSingle;
        });
        it('links a multi-key property path', () => {
            const env = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
            });
            globalThis.linkTestChainA = { linkTestChainB: { linkTestChainC: 99 } };
            expect(() => env.link('linkTestChainA', 'linkTestChainB')).not.toThrow();
            delete globalThis.linkTestChainA;
        });
    });

    describe('VirtualEnvironment.prototype.lazyRemapProperties', () => {
        it('installs lazy property descriptors for given ownKeys', () => {
            const env = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
            });
            const target = { lazyPropA: 1, lazyPropB: 2 };
            expect(() => env.lazyRemapProperties(target, ['lazyPropA', 'lazyPropB'])).not.toThrow();
        });
        it('accepts unforgeableGlobalThisKeys parameter', () => {
            const env = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
            });
            const target = { x: 1 };
            expect(() => env.lazyRemapProperties(target, ['x'], ['window'])).not.toThrow();
        });
        it('ignores primitive targets', () => {
            const env = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
            });
            expect(() => env.lazyRemapProperties(null as any, ['a'])).not.toThrow();
            expect(() => env.lazyRemapProperties(42 as any, ['a'])).not.toThrow();
        });
    });

    describe('VirtualEnvironment.prototype.trackAsFastTarget', () => {
        it('does not throw for object targets', () => {
            const env = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
            });
            const target = { fast: true };
            expect(() => env.trackAsFastTarget(target)).not.toThrow();
        });
        it('does not throw for function targets', () => {
            const env = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
            });
            expect(() => env.trackAsFastTarget(() => {})).not.toThrow();
        });
        it('ignores primitive targets', () => {
            const env = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
            });
            expect(() => env.trackAsFastTarget(null as any)).not.toThrow();
            expect(() => env.trackAsFastTarget(42 as any)).not.toThrow();
        });
    });

    describe('options.instrumentation', () => {
        it('accepts an instrumentation object without error', () => {
            const mockInstrumentation = {
                startActivity: () => ({ stop() {}, error() {} }),
                log() {},
                error() {},
            };
            expect(() => {
                const env = new VirtualEnvironment({
                    blueConnector: createBlueConnector(globalThis),
                    redConnector: createRedConnector(globalThis.eval),
                    instrumentation: mockInstrumentation,
                });
                env.evaluate('1 + 1');
            }).not.toThrow();
        });
    });
});
