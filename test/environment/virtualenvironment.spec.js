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

    describe('constructor', () => {
        it('throws when options is missing', () => {
            expect.assertions(1);
            expect(() => {
                // eslint-disable-next-line no-new
                new VirtualEnvironment();
            }).toThrow();
        });
    });

    describe('distortionCallback', () => {
        it('distorts getters', () => {
            expect.assertions(3);

            const aGetter = () => 'a';
            const bGetter = () => 'b';
            const cGetter = () => 'c';

            const ve = new VirtualEnvironment({
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
            ve.link('globalThis');
            ve.remapProperties(blueGlobalThis, {
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

            expect(ve.evaluate('a')).toBe('b');
            expect(ve.evaluate('b')).toBe('a');
            expect(ve.evaluate('c')).toBe('c');
        });
    });

    describe('liveTargetCallback', () => {
        it('affects target liveness', () => {
            expect.assertions(2);

            const a = { foo: 1 };
            const b = { foo: 1 };

            const ve = new VirtualEnvironment({
                blueConnector: createBlueConnector(blueGlobalThis),
                redConnector: createRedConnector(redGlobalThis.eval),
                liveTargetCallback(v) {
                    return v === a;
                },
            });
            ve.link('globalThis');
            ve.remapProperties(blueGlobalThis, {
                a: {
                    value: a,
                    configurable: true,
                },
                b: {
                    value: b,
                    configurable: true,
                },
            });

            ve.evaluate('a.bar = 2');
            ve.evaluate('b.bar = 2');

            expect(a).toEqual({ foo: 1, bar: 2 });
            expect(b).toEqual({ foo: 1 });
        });
    });

    describe('VirtualEnvironment.prototype.evaluate', () => {
        it("calls through to the red realm's callable evaluation function", () => {
            expect.assertions(1);

            const ve = new VirtualEnvironment({
                blueConnector: createBlueConnector(blueGlobalThis),
                redConnector: createRedConnector(redGlobalThis.eval),
            });

            const sourceTextToEvaluate = 'Hello!';
            ve.redCallableEvaluate = (sourceText) => {
                expect(sourceText).toBe(sourceTextToEvaluate);
            };

            ve.evaluate(sourceTextToEvaluate);
        });
        it('throws pushed error from blue target', () => {
            expect.assertions(1);

            const ve = new VirtualEnvironment({
                blueConnector: createBlueConnector(blueGlobalThis),
                redConnector: createRedConnector(redGlobalThis.eval),
            });

            expect(() => {
                ve.evaluate('a_very_specific_string');
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
            expect.assertions(1);

            const ve = new VirtualEnvironment({
                blueConnector: createBlueConnector(blueGlobalThis),
                redConnector: createRedConnector(redGlobalThis.eval),
            });

            const ExpectedError = class extends Error {};
            const error = new ExpectedError();
            ve.redCallableEvaluate = () => {
                throw error;
            };
            ve.blueGetSelectedTarget = () => undefined;

            expect(() => {
                ve.evaluate('foo');
            }).toThrow(error);
        });
    });

    describe('VirtualEnvironment.prototype.remapProperties', () => {
        it('does not skip index-like properties', () => {
            expect.assertions(1);

            const ve = new VirtualEnvironment({
                blueConnector: createBlueConnector(blueGlobalThis),
                redConnector: createRedConnector(redGlobalThis.eval),
                liveTargetCallback() {
                    return true;
                },
            });

            const redValue = {};
            ve.remapProperties(redValue, Object.getOwnPropertyDescriptors({ 0: 'foo' }));

            expect(Object.getOwnPropertyNames(redValue)).toEqual(['0']);
        });
        it('skips untamable properties, ie. descriptor is not configurable', () => {
            expect.assertions(1);

            const ve = new VirtualEnvironment({
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
            ve.remapProperties(redValue, Object.getOwnPropertyDescriptors({ a: 1 }));

            expect(redValue.a).toBe(0);
        });
    });

    describe('VirtualEnvironment.prototype.remapProto', () => {
        it('calls `blueGetTransferableValue` for `target` and `proto` arguments', () => {
            expect.assertions(2);

            const ve = new VirtualEnvironment({
                blueConnector: createBlueConnector(blueGlobalThis),
                redConnector: createRedConnector(redGlobalThis.eval),
            });

            const a = {};
            const b = {};

            const calledWith = [];

            ve.blueGetTransferableValue = (value) => {
                calledWith.push(value);
                return value;
            };
            ve.redCallableSetPrototypeOf = (a, b) => {
                expect(a).toBe(calledWith[0]);
                expect(b).toBe(calledWith[1]);
            };

            ve.remapProto(a, b);
        });
    });
});
