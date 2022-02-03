// @ts-nocheck
import {
    createConnector,
    createMembraneMarshall,
    getResolvedShapeDescriptors,
    VirtualEnvironment,
} from '../index';

const init = createMembraneMarshall();

const { toString: ObjectProtoToString } = Object.prototype;

function getToStringTag(object) {
    return ObjectProtoToString.call(object).slice(8, -1);
}

describe('VirtualEnvironment', () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    it('throws when options bag is missing', () => {
        expect.assertions(1);
        expect(() => {
            // eslint-disable-next-line no-new
            new VirtualEnvironment();
        }).toThrow(/Missing VirtualEnvironmentOptions options bag/);
    });

    describe('VirtualEnvironment.prototype.evaluate', () => {
        it("calls through to the red realm's callable evaluation function", () => {
            expect.assertions(1);

            // eslint-disable-next-line no-eval
            const redConnector = createConnector(globalThis.eval);

            const ve = new VirtualEnvironment({
                blueConnector: init,
                redConnector,
            });
            ve.link('globalThis');

            const sourceTextToEvaluate = '"Hello!"';
            ve.redCallableEvaluate = (sourceText) => {
                expect(sourceText).toBe(sourceTextToEvaluate);
            };

            ve.evaluate(sourceTextToEvaluate);
        });
        it('throws pushed error from blue target', () => {
            expect.assertions(1);

            // eslint-disable-next-line no-eval
            const redConnector = createConnector(globalThis.eval);

            const ve = new VirtualEnvironment({
                blueConnector: init,
                redConnector,
            });
            ve.link('globalThis');

            expect(() => {
                ve.evaluate('foo');
            }).toThrow('foo is not defined');
        });
        it('rethrows if blue target does not have pushed error', () => {
            expect.assertions(1);

            // eslint-disable-next-line no-eval
            const redConnector = createConnector(globalThis.eval);

            const ve = new VirtualEnvironment({
                blueConnector: init,
                redConnector,
            });
            ve.link('globalThis');

            const ExpectedError = class extends Error {};
            const error = new ExpectedError();
            ve.redCallableEvaluate = (_sourceText) => {
                throw error;
            };
            ve.blueGetSelectedTarget = () => undefined;

            expect(() => {
                ve.evaluate('foo');
            }).toThrow(error);
        });
        it('returns result of evaluated expression', () => {
            expect.assertions(12);

            // eslint-disable-next-line no-eval
            const redConnector = createConnector(globalThis.eval);

            const ve = new VirtualEnvironment({
                blueConnector: init,
                redConnector,
            });
            ve.link('globalThis');

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

    describe('VirtualEnvironment.prototype.remap', () => {
        it('does not skip index-like properties', () => {
            expect.assertions(1);

            // eslint-disable-next-line no-eval
            const redConnector = createConnector(globalThis.eval);

            const ve = new VirtualEnvironment({
                blueConnector: init,
                redConnector,
            });
            ve.link('globalThis');

            const redValue = {};
            const endowments: typeof globalThis = {
                0: 'foo',
            };

            ve.remap(redValue, getResolvedShapeDescriptors(endowments));

            expect(Object.getOwnPropertyNames(redValue)).toEqual(['0']);
        });
        it('skips untamable properties, ie. descriptor is not configurable', () => {
            expect.assertions(1);

            // eslint-disable-next-line no-eval
            const redConnector = createConnector(globalThis.eval);

            const ve = new VirtualEnvironment({
                blueConnector: init,
                redConnector,
            });
            ve.link('globalThis');

            const redValue = {} as any;
            Object.defineProperty(redValue, 'a', {
                value: 0,
                configurable: false,
            });
            const endowments = {
                a: 1,
            };

            ve.remap(redValue, getResolvedShapeDescriptors(endowments));

            expect(redValue.a).toBe(0);
        });
        it('calls a lazy endowment getter', () => {
            expect.assertions(3);

            let count = 0;

            // istanbul ignore next
            // eslint-disable-next-line no-eval
            const redConnector = createConnector(globalThis.eval);

            const ve = new VirtualEnvironment({
                blueConnector: init,
                redConnector,
                distortionCallback(v) {
                    count += 1;
                    // This ignore is to suppress the following:
                    //  "Not all constituents of type 'RedProxyTarget' are callable."
                    // Which is generally true, but not in this case.
                    expect(v()).toBe(1);
                    return v;
                },
            });
            ve.link('globalThis');

            const endowments = {};

            Object.defineProperty(endowments, 'b', {
                get() {
                    count += 1;
                    return 1;
                },
                configurable: true,
            });

            ve.remap(globalThis, getResolvedShapeDescriptors(endowments));

            expect(globalThis.b).toBe(1);
            expect(count).toBe(3);
        });
        it('calls a lazy endowment setter', () => {
            expect.assertions(7);

            let count = 0;
            let blueSetValue = null;

            // eslint-disable-next-line no-eval
            const redConnector = createConnector(globalThis.eval);

            const ve = new VirtualEnvironment({
                blueConnector: init,
                redConnector,
            });
            ve.link('globalThis');

            const endowments = {};
            Object.defineProperty(endowments, 'c', {
                get() {
                    // This WILL be reached, but only until the setter is called
                    count += 1;
                    return 1;
                },
                set(v) {
                    // This should NOT be reached
                    blueSetValue = v;
                    count += 1;
                },
            });

            ve.remap(globalThis, getResolvedShapeDescriptors(endowments));

            expect(globalThis.c).toBe(1); // count + 1
            expect(globalThis.c).toBe(1); // count + 1
            expect(globalThis.c).toBe(1); // count + 1
            expect(count).toBe(3);
            globalThis.c = 99;
            expect(globalThis.c).toBe(1);
            expect(blueSetValue).toBe(99);
            expect(count).toBe(6);
        });
    });

    describe('VirtualEnvironment.prototype.remapProto', () => {
        it('calls blueGetTransferableValue with both args', () => {
            expect.assertions(2);

            // eslint-disable-next-line no-eval
            const redConnector = createConnector(globalThis.eval);

            const ve = new VirtualEnvironment({
                blueConnector: init,
                redConnector,
            });
            ve.link('globalThis');

            const a = {};
            const b = {};

            const calledWith: any[] = [];

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
