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
            ve.link('globalThis');
            ve.remapProperties(globalThis, {
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

    describe('VirtualEnvironment.prototype.evaluate', () => {
        it("calls through to the red realm's callable evaluation function", () => {
            expect.assertions(1);

            const ve = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
            });

            const sourceTextToEvaluate = '"Hello!"';
            ve.redCallableEvaluate = (sourceText) => {
                expect(sourceText).toBe(sourceTextToEvaluate);
            };

            ve.evaluate(sourceTextToEvaluate);
        });
        it('throws pushed error from blue target', () => {
            expect.assertions(1);

            const ve = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
            });

            expect(() => {
                ve.evaluate('foo');
            }).toThrow('foo is not defined');
        });
        it('rethrows if blue target does not have pushed error', () => {
            expect.assertions(1);

            const ve = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
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
        it('returns result of evaluated expression', () => {
            expect.assertions(12);

            const ve = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
            });

            expect(ve.evaluate('["a"]')).toEqual(['a']);
            expect(ve.evaluate('true')).toBe(true);
            expect(ve.evaluate('false')).toBe(false);
            expect(getToStringTag(ve.evaluate('(function a(){})'))).toBe('Function');
            expect(getToStringTag(ve.evaluate('(async ()=>{})'))).toBe('AsyncFunction');
            expect(getToStringTag(ve.evaluate('(function * (){})'))).toBe('GeneratorFunction');
            expect(getToStringTag(ve.evaluate('(async function * (){})'))).toBe(
                'AsyncGeneratorFunction'
            );
            expect(getToStringTag(ve.evaluate('new Date()'))).toBe('Date');
            expect(ve.evaluate('({ a: 1 })')).toEqual({ a: 1 });
            expect(ve.evaluate('1 + 2')).toBe(3);
            expect(getToStringTag(ve.evaluate('/a/'))).toBe('RegExp');
            expect(ve.evaluate('"Hello!"')).toBe('Hello!');
        });
    });

    describe('VirtualEnvironment.prototype.remapProperties', () => {
        it('does not skip index-like properties', () => {
            expect.assertions(1);

            const ve = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
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
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
            });

            const redValue = {};
            Object.defineProperty(redValue, 'a', {
                value: 0,
                configurable: false,
            });
            ve.remapProperties(redValue, Object.getOwnPropertyDescriptors({ a: 1 }));

            expect(redValue.a).toBe(0);
        });
        it('calls an endowment getter', () => {
            expect.assertions(3);

            let count = 0;

            const ve = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
                distortionCallback(v) {
                    expect(v()).toBe(1);
                    return v;
                },
            });
            ve.link('globalThis');
            ve.remapProperties(globalThis, {
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
            expect.assertions(2);

            let blueSetValue = null;

            const ve = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
            });
            ve.link('globalThis');
            ve.remapProperties(globalThis, {
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

            const ve = new VirtualEnvironment({
                blueConnector: createBlueConnector(globalThis),
                redConnector: createRedConnector(globalThis.eval),
            });

            const a = {};
            const b = {};
            const calledWith = [];
            ve.blueGetTransferableValue = (target: any) => {
                calledWith.push(target);
                return target;
            };
            ve.redCallableSetPrototypeOf = (targetPointer: any, protoPointerOrNull: any) => {
                expect(targetPointer).toBe(calledWith[0]);
                expect(protoPointerOrNull).toBe(calledWith[1]);
            };

            ve.remapProto(a, b);
        });
    });
});
