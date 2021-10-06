// @ts-nocheck
import { SupportFlagsField } from '../../types';
import {
    createConnector,
    createMembraneMarshall,
    getResolvedShapeDescriptors,
    HooksCallback,
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
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);
        expect(() => {
            // @ts-ignore
            // eslint-disable-next-line no-new
            new VirtualEnvironment();
        }).toThrow(/Missing VirtualEnvironmentOptions options bag/);
    });
    it('forwards support { ... } as bit fields to init functions', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(2);

        // @ts-ignore
        const interceptor: typeof init = (
            _name: string,
            _shouldOrNotTrapMutation: boolean,
            supportFlags: SupportFlagsField,
            exportsCallback: HooksCallback
        ) => {
            expect(supportFlags).toBe(0b1 /* 1 */);
            // @ts-ignore
            exportsCallback();
            return () => {};
        };

        // eslint-disable-next-line no-new
        new VirtualEnvironment({
            blueConnector: interceptor,
            redConnector: interceptor,
            support: {
                magicMarker: true,
            },
        });
    });
    describe('VirtualEnvironment.prototype.evaluate', () => {
        it("calls through to the red realm's callable evaluation function", () => {
            // Ignoring "Property 'assertions' does not exist on type '{...}'."
            // @ts-ignore
            expect.assertions(1);

            // eslint-disable-next-line no-eval
            const redConnector = createConnector(globalThis.eval);

            const ve = new VirtualEnvironment({
                blueConnector: init,
                redConnector,
            });
            ve.link('globalThis');

            const sourceTextToEvaluate = '"Hello!"';
            // @ts-ignore
            ve.redCallableEvaluate = (sourceText) => {
                expect(sourceText).toBe(sourceTextToEvaluate);
            };

            ve.evaluate(sourceTextToEvaluate);
        });

        it('throws pushed error from blue target', () => {
            // Ignoring "Property 'assertions' does not exist on type '{...}'."
            // @ts-ignore
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
            // Ignoring "Property 'assertions' does not exist on type '{...}'."
            // @ts-ignore
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
            // @ts-ignore
            ve.redCallableEvaluate = (_sourceText) => {
                throw error;
            };
            // @ts-ignore
            ve.blueGetSelectedTarget = () => undefined;

            expect(() => {
                ve.evaluate('foo');
            }).toThrow(error);
        });

        it('returns result of evaluated expression', () => {
            // Ignoring "Property 'assertions' does not exist on type '{...}'."
            // @ts-ignore
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
        it('Skips index-like properties', () => {
            // Ignoring "Property 'assertions' does not exist on type '{...}'."
            // @ts-ignore
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
                // @ts-ignore
                0: 'foo',
            };

            ve.remap(redValue, getResolvedShapeDescriptors(endowments));

            expect(Object.getOwnPropertyNames(redValue).length).toBe(0);
        });
        it('Skips untamable properties, ie. descriptor is not configurable', () => {
            // Ignoring "Property 'assertions' does not exist on type '{...}'."
            // @ts-ignore
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
            // Ignoring "Property 'assertions' does not exist on type '{...}'."
            // @ts-ignore
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
                    // @ts-ignore
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
            // Ignoring "Property 'assertions' does not exist on type '{...}'."
            // @ts-ignore
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
                // @ts-ignore
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
    describe('VirtualEnvironment.prototype.lazyRemap', () => {
        it('Skips index-like properties', () => {
            // Ignoring "Property 'assertions' does not exist on type '{...}'."
            // @ts-ignore
            expect.assertions(1);

            // eslint-disable-next-line no-eval
            const redConnector = createConnector(globalThis.eval);

            const ve = new VirtualEnvironment({
                blueConnector: init,
                redConnector,
            });
            ve.link('globalThis');

            const redValue = {};
            const endowments = {
                0: 'foo',
            };

            ve.lazyRemap(redValue, Object.keys(getResolvedShapeDescriptors(endowments)));
            expect(Object.getOwnPropertyNames(redValue).length).toBe(0);
        });

        it('Skips index-like properties, called after remap', () => {
            // Ignoring "Property 'assertions' does not exist on type '{...}'."
            // @ts-ignore
            expect.assertions(2);

            // eslint-disable-next-line no-eval
            const redConnector = createConnector(globalThis.eval);

            const ve = new VirtualEnvironment({
                blueConnector: init,
                redConnector,
            });
            ve.link('globalThis');

            const redValue = {};
            const endowments = {
                0: 'foo',
            };

            ve.remap(redValue, getResolvedShapeDescriptors(endowments));
            expect(Object.getOwnPropertyNames(redValue).length).toBe(0);

            ve.lazyRemap(redValue, Object.keys(getResolvedShapeDescriptors(endowments)));
            expect(Object.getOwnPropertyNames(redValue).length).toBe(0);
        });

        it('Skips untamable properties, ie. descriptor is not configurable', () => {
            // Ignoring "Property 'assertions' does not exist on type '{...}'."
            // @ts-ignore
            expect.assertions(2);

            // eslint-disable-next-line no-eval
            const redConnector = createConnector(globalThis.eval);

            const ve = new VirtualEnvironment({
                blueConnector: init,
                redConnector,
            });
            ve.link('globalThis');

            const redValue = {} as any;
            Object.defineProperty(redValue, 'd', {
                value: 0,
                configurable: false,
            });
            const endowments = {
                d: 1,
            };

            ve.remap(redValue, getResolvedShapeDescriptors(endowments));
            expect(redValue.d).toBe(0);

            ve.lazyRemap(redValue, Object.keys(getResolvedShapeDescriptors(endowments)));
            expect(redValue.d).toBe(0);
        });

        xit('will not call an endowment getter that does not exist', () => {
            // Ignoring "Property 'assertions' does not exist on type '{...}'."
            // @ts-ignore
            expect.assertions(2);

            let count = 0;

            // istanbul ignore next
            // eslint-disable-next-line no-eval
            const redConnector = createConnector(globalThis.eval);

            const ve = new VirtualEnvironment({
                blueConnector: init,
                redConnector,
            });
            ve.link('globalThis');

            const endowments = {};

            Object.defineProperty(endowments, 'e', {
                get() {
                    count += 1;
                    return 1;
                },
                configurable: true,
            });

            ve.lazyRemap(globalThis, Object.keys(getResolvedShapeDescriptors(endowments)));

            expect(globalThis.e).toBe(undefined);
            expect(count).toBe(0);
        });

        xit('calls a lazy endowment getter, called after remap', () => {
            // Ignoring "Property 'assertions' does not exist on type '{...}'."
            // @ts-ignore
            expect.assertions(5);

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
                    // @ts-ignore
                    expect(v()).toBe(1);
                    return v;
                },
            });
            ve.link('globalThis');

            const endowments = {};

            Object.defineProperty(endowments, 'f', {
                get() {
                    count += 1;
                    return 1;
                },
                configurable: true,
            });

            ve.remap(globalThis, getResolvedShapeDescriptors(endowments));
            expect(globalThis.f).toBe(1);
            expect(count).toBe(3);

            ve.lazyRemap(globalThis, Object.keys(getResolvedShapeDescriptors(endowments)));

            expect(globalThis.f).toBe(1);
            expect(count).toBe(4);
        });

        xit('will not call an endowment setter that does not exist', () => {
            // Ignoring "Property 'assertions' does not exist on type '{...}'."
            // @ts-ignore
            // expect.assertions(11);

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
            Object.defineProperty(endowments, 'g', {
                get() {
                    // This WILL be reached, but only until the setter is called
                    count += 1;
                    return 1;
                },
                // @ts-ignore
                set(v) {
                    // This should NOT be reached
                    blueSetValue = v;
                    count += 1;
                },
            });

            ve.lazyRemap(globalThis, Object.keys(getResolvedShapeDescriptors(endowments)));

            expect(count).toBe(0);

            globalThis.g = 999;
            expect(globalThis.g).toBe(999);
            expect(blueSetValue).toBe(null);
            expect(count).toBe(0);
        });

        xit('calls a lazy endowment setter, called after remap', () => {
            // Ignoring "Property 'assertions' does not exist on type '{...}'."
            // @ts-ignore
            expect.assertions(11);

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
            Object.defineProperty(endowments, 'h', {
                get() {
                    // This WILL be reached, but only until the setter is called
                    count += 1;
                    return 1;
                },
                // @ts-ignore
                set(v) {
                    // This should NOT be reached
                    blueSetValue = v;
                    count += 1;
                },
            });

            ve.remap(globalThis, getResolvedShapeDescriptors(endowments));

            expect(globalThis.h).toBe(1); // count + 1
            expect(globalThis.h).toBe(1); // count + 1
            expect(globalThis.h).toBe(1); // count + 1
            expect(count).toBe(3);
            globalThis.h = 99;
            expect(globalThis.h).toBe(1);
            expect(blueSetValue).toBe(99);
            expect(count).toBe(6);

            ve.lazyRemap(globalThis, Object.keys(getResolvedShapeDescriptors(endowments)));

            expect(count).toBe(6);

            globalThis.h = 999;
            expect(globalThis.h).toBe(1);
            expect(blueSetValue).toBe(999);
            expect(count).toBe(9);
        });

        it('respects enumerable symbol properties on target', () => {
            // Ignoring "Property 'assertions' does not exist on type '{...}'."
            // @ts-ignore
            expect.assertions(2);

            // eslint-disable-next-line no-eval
            const redConnector = createConnector(globalThis.eval);

            const ve = new VirtualEnvironment({
                blueConnector: init,
                redConnector,
            });
            ve.link('globalThis');

            const symbol = Symbol.for('@@something');
            const target = {};
            Object.defineProperty(target, symbol, {
                value: undefined,
                enumerable: true,
            });

            // @ts-ignore
            ve.redCallableInstallLazyDescriptors = (...args) => {
                expect(args[1]).toBe(symbol);
                expect(args[2]).toBe(true);
            };

            ve.lazyRemap(target, [symbol]);
        });

        it('respects non-enumerable symbol properties on target', () => {
            // Ignoring "Property 'assertions' does not exist on type '{...}'."
            // @ts-ignore
            expect.assertions(2);

            // eslint-disable-next-line no-eval
            const redConnector = createConnector(globalThis.eval);

            const ve = new VirtualEnvironment({
                blueConnector: init,
                redConnector,
            });
            ve.link('globalThis');

            const symbol = Symbol.for('@@something');
            const target = {};
            Object.defineProperty(target, symbol, {
                value: undefined,
                enumerable: false,
            });

            // @ts-ignore
            ve.redCallableInstallLazyDescriptors = (...args) => {
                expect(args[1]).toBe(symbol);
                expect(args[2]).toBe(false);
            };

            ve.lazyRemap(target, [symbol]);
        });
    });
    describe('VirtualEnvironment.prototype.remapProto', () => {
        it('calls blueGetTransferableValue with both args', () => {
            // Ignoring "Property 'assertions' does not exist on type '{...}'."
            // @ts-ignore
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

            // @ts-ignore
            ve.blueGetTransferableValue = (value) => {
                calledWith.push(value);
                return value;
            };
            // @ts-ignore
            ve.redCallableSetPrototypeOf = (a, b) => {
                expect(a).toBe(calledWith[0]);
                expect(b).toBe(calledWith[1]);
            };

            ve.remapProto(a, b);
        });
    });
});
