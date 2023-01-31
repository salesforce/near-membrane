import {
    createBlueConnector,
    createRedConnector,
    VirtualEnvironment,
} from '@locker/near-membrane-base';

/*
    These tests are exercising the BUILT near-membrane-base,
    ie. package/near-membrane-base/dist/index.js
*/
describe('VirtualEnvironment', () => {
    const blueGlobalThis = globalThis;
    let redGlobalThis;

    beforeEach(() => {
        const iframe = document.createElement('iframe');
        iframe.id = 'red-realm';
        document.body.appendChild(iframe);
        redGlobalThis = iframe.contentWindow;
    });

    afterEach(() => {
        const iframe = document.getElementById('red-realm');
        iframe.remove();
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
                    blueConnector: createBlueConnector(blueGlobalThis),
                    redConnector: createRedConnector(redGlobalThis.eval),
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
                env.remapProperties(blueGlobalThis, {
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
                expect(env.evaluate('a')).toBe('b');
                expect(env.evaluate('b')).toBe('a');
                expect(env.evaluate('c')).toBe('c');
            });
        });

        describe('options.liveTargetCallback', () => {
            it('affects target liveness', () => {
                const a = { foo: 1 };
                const b = { foo: 1 };
                const env = new VirtualEnvironment({
                    blueConnector: createBlueConnector(blueGlobalThis),
                    redConnector: createRedConnector(redGlobalThis.eval),
                    liveTargetCallback(v) {
                        return v === a;
                    },
                });
                env.link('globalThis');
                env.remapProperties(blueGlobalThis, {
                    a: {
                        value: a,
                        configurable: true,
                    },
                    b: {
                        value: b,
                        configurable: true,
                    },
                });
                env.evaluate('a.bar = 2');
                env.evaluate('b.bar = 2');
                expect(a).toEqual({ foo: 1, bar: 2 });
                expect(b).toEqual({ foo: 1 });
            });
        });

        describe('options.revokedProxyCallback', () => {
            it('treats relevant object as revoked', () => {
                const a = { foo: 1 };
                const b = { foo: 1 };
                const env = new VirtualEnvironment({
                    blueConnector: createBlueConnector(blueGlobalThis),
                    redConnector: createRedConnector(redGlobalThis.eval),
                    revokedProxyCallback(v) {
                        return v === a;
                    },
                });
                env.link('globalThis');
                env.remapProperties(blueGlobalThis, {
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
            });
        });

        describe('options.signSourceCallback', () => {
            it('is called for code evaluation', () => {
                const options = {
                    blueConnector: createBlueConnector(blueGlobalThis),
                    redConnector: createRedConnector(redGlobalThis.eval),
                    signSourceCallback: (sourceText) => sourceText,
                };
                const signSourceCallbackSpy = spyOn(
                    options,
                    'signSourceCallback'
                ).and.callThrough();
                const env = new VirtualEnvironment(options);
                expect(env.evaluate('1 + 2')).toBe(3);
                expect(signSourceCallbackSpy).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('VirtualEnvironment.prototype.evaluate', () => {
        it("calls through to the red realm's callable evaluation function", () => {
            expect.assertions(1);

            const env = new VirtualEnvironment({
                blueConnector: createBlueConnector(blueGlobalThis),
                redConnector: createRedConnector(redGlobalThis.eval),
            });
            const sourceTextToEvaluate = 'Hello!';
            env.redCallableEvaluate = (sourceText) => {
                expect(sourceText).toBe(sourceTextToEvaluate);
            };
            env.evaluate(sourceTextToEvaluate);
        });
        it('throws pushed error from blue target', () => {
            const env = new VirtualEnvironment({
                blueConnector: createBlueConnector(blueGlobalThis),
                redConnector: createRedConnector(redGlobalThis.eval),
            });
            expect(() => {
                env.evaluate('a_very_specific_string');
            }).toThrowMatching(
                (thrown) =>
                    // Since this is tested against two different browsers,
                    // which both have different error message strings, the test
                    // here is to vaguely assess that error is "probably" correct.
                    String(thrown).includes('ReferenceError') &&
                    String(thrown).includes('a_very_specific_string')
            );
        });
        it('rethrows if blue target does not have pushed error', () => {
            const env = new VirtualEnvironment({
                blueConnector: createBlueConnector(blueGlobalThis),
                redConnector: createRedConnector(redGlobalThis.eval),
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
    });

    describe('VirtualEnvironment.prototype.remapProperties', () => {
        it('does not skip index-like properties', () => {
            const env = new VirtualEnvironment({
                blueConnector: createBlueConnector(blueGlobalThis),
                redConnector: createRedConnector(redGlobalThis.eval),
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
                blueConnector: createBlueConnector(blueGlobalThis),
                redConnector: createRedConnector(redGlobalThis.eval),
                liveTargetCallback() {
                    return true;
                },
            });
            const redValue = {};
            Object.defineProperty(redValue, 'a', {
                value: 0,
                configurable: false,
            });
            env.remapProperties(redValue, Object.getOwnPropertyDescriptors({ a: 1 }));
            expect(redValue.a).toBe(0);
        });
    });

    describe('VirtualEnvironment.prototype.remapProto', () => {
        it('calls `blueGetTransferableValue` for `target` and `proto` arguments', () => {
            expect.assertions(2);

            const env = new VirtualEnvironment({
                blueConnector: createBlueConnector(blueGlobalThis),
                redConnector: createRedConnector(redGlobalThis.eval),
            });
            const a = {};
            const b = {};
            const calledWith = [];
            env.blueGetTransferableValue = (target) => {
                calledWith.push(target);
                return target;
            };
            env.redCallableSetPrototypeOf = (targetPointer, protoPointerOrNull) => {
                expect(targetPointer).toBe(calledWith[0]);
                expect(protoPointerOrNull).toBe(calledWith[1]);
            };
            env.remapProto(a, b);
        });
    });
});
