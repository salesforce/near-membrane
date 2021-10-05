import {
    createMembraneMarshall,
    getResolvedShapeDescriptors,
    marshallSourceTextInStrictMode,
    VirtualEnvironment,
} from '@locker/near-membrane-base';

const init = createMembraneMarshall();

/*
    These tests are exercising the BUILT near-membrane-base,
    ie. package/near-membrane-base/lib/index.js
*/
describe('Implementing an environment with VirtualEnvironment', () => {
    let redRealmGlobal;

    beforeEach(() => {
        const iframe = document.createElement('iframe');
        iframe.id = 'red-realm';
        document.body.appendChild(iframe);

        redRealmGlobal = iframe.contentWindow.window;
    });

    afterEach(() => {
        const iframe = document.getElementById('red-realm');
        iframe.remove();
    });

    it('throws when options bag is missing', () => {
        expect.assertions(1);
        expect(() => {
            // eslint-disable-next-line no-new
            new VirtualEnvironment();
        }).toThrow();
    });

    it('forwards support { ... } as bit fields to init functions', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(2);

        const interceptor = (_name, _shouldOrNotTrapMutation, supportFlags, exportsCallback) => {
            expect(supportFlags).toBe(0b1 /* 1 */);
            exportsCallback();
            return () => {};
        };

        const distortionCallback = (v) => v;

        // eslint-disable-next-line no-new
        new VirtualEnvironment({
            blueConnector: interceptor,
            redConnector: interceptor,
            distortionCallback,
            support: {
                magicMarker: true,
            },
        });
    });

    describe('VirtualEnvironment.prototype.evaluate', () => {
        it("calls through to the red realm's callable evaluation function", () => {
            expect.assertions(1);

            // eslint-disable-next-line no-eval
            const redConnector = redRealmGlobal.eval(marshallSourceTextInStrictMode)();

            const ve = new VirtualEnvironment({
                blueConnector: init,
                redConnector,
            });
            ve.link('globalThis');

            const sourceTextToEvaluate = 'Hello!';
            ve.redCallableEvaluate = (sourceText) => {
                expect(sourceText).toBe(sourceTextToEvaluate);
            };

            ve.evaluate(sourceTextToEvaluate);
        });

        it('throws pushed error from blue target', () => {
            expect.assertions(1);

            // eslint-disable-next-line no-eval
            const redConnector = redRealmGlobal.eval(marshallSourceTextInStrictMode)();

            const ve = new VirtualEnvironment({
                blueConnector: init,
                redConnector,
            });
            ve.link('globalThis');

            expect(() => {
                ve.evaluate('a_very_specific_string');
            }).toThrowMatching((thrown) => {
                // Since this is tested against two different browsers, which both have different error message
                // strings, the test here is to vaguely assess that error is "probably" correct.
                return (
                    String(thrown).includes('ReferenceError') &&
                    String(thrown).includes('a_very_specific_string')
                );
            });
        });

        it('rethrows if blue target does not have pushed error', () => {
            expect.assertions(1);

            // eslint-disable-next-line no-eval
            const redConnector = redRealmGlobal.eval(marshallSourceTextInStrictMode)();

            const ve = new VirtualEnvironment({
                blueConnector: init,
                redConnector,
            });
            ve.link('globalThis');

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

    describe('VirtualEnvironment.prototype.remap', () => {
        it('Skips index-like properties', () => {
            expect.assertions(1);

            // eslint-disable-next-line no-eval
            const redConnector = redRealmGlobal.eval(marshallSourceTextInStrictMode)();

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
        });
        it('Skips untamable properties, ie. descriptor is not configurable', () => {
            expect.assertions(1);

            // eslint-disable-next-line no-eval
            const redConnector = redRealmGlobal.eval(marshallSourceTextInStrictMode)();

            const ve = new VirtualEnvironment({
                blueConnector: init,
                redConnector,
            });
            ve.link('globalThis');

            const redValue = {};
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
    });

    describe('VirtualEnvironment.prototype.lazyRemap', () => {
        it('Skips index-like properties', () => {
            expect.assertions(1);

            // eslint-disable-next-line no-eval
            const redConnector = redRealmGlobal.eval(marshallSourceTextInStrictMode)();

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
            expect.assertions(2);

            // eslint-disable-next-line no-eval
            const redConnector = redRealmGlobal.eval(marshallSourceTextInStrictMode)();

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
            expect.assertions(2);

            // eslint-disable-next-line no-eval
            const redConnector = redRealmGlobal.eval(marshallSourceTextInStrictMode)();

            const ve = new VirtualEnvironment({
                blueConnector: init,
                redConnector,
            });
            ve.link('globalThis');

            const redValue = {};
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

        it('will not call an endowment getter that does not exist', () => {
            expect.assertions(2);

            let count = 0;

            // istanbul ignore next
            // eslint-disable-next-line no-eval
            const redConnector = redRealmGlobal.eval(marshallSourceTextInStrictMode)();

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

        it('will not call an endowment setter that does not exist', () => {
            // expect.assertions(11);

            let count = 0;
            let blueSetValue = null;

            // eslint-disable-next-line no-eval
            const redConnector = redRealmGlobal.eval(marshallSourceTextInStrictMode)();

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

        it('respects enumerable symbol properties on target', () => {
            expect.assertions(2);

            // eslint-disable-next-line no-eval
            const redConnector = redRealmGlobal.eval(marshallSourceTextInStrictMode)();

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

            ve.redCallableInstallLazyDescriptors = (...args) => {
                expect(args[1]).toBe(symbol);
                expect(args[2]).toBe(true);
            };

            ve.lazyRemap(target, [symbol]);
        });

        it('respects non-enumerable symbol properties on target', () => {
            expect.assertions(2);

            // eslint-disable-next-line no-eval
            const redConnector = redRealmGlobal.eval(marshallSourceTextInStrictMode)();

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

            ve.redCallableInstallLazyDescriptors = (...args) => {
                expect(args[1]).toBe(symbol);
                expect(args[2]).toBe(false);
            };

            ve.lazyRemap(target, [symbol]);
        });
    });
    describe('VirtualEnvironment.prototype.remapProto', () => {
        it('calls blueGetTransferableValue with both args', () => {
            expect.assertions(2);

            // eslint-disable-next-line no-eval
            const redConnector = redRealmGlobal.eval(marshallSourceTextInStrictMode)();

            const ve = new VirtualEnvironment({
                blueConnector: init,
                redConnector,
            });
            ve.link('globalThis');

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
