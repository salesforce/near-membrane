import { getFilteredEndowmentDescriptors, init, VirtualEnvironment } from '../index';

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
    describe('VirtualEnvironment.prototype.remap', () => {
        it('Skips index-like properties', () => {
            // Ignoring "Property 'assertions' does not exist on type '{...}'."
            // @ts-ignore
            expect.assertions(1);

            const initSourceText = `(function(){'use strict';return (${init.toString()})})()`;
            // eslint-disable-next-line no-eval
            const redConnector = globalThis.eval(initSourceText);

            const ve = new VirtualEnvironment({
                blueConnector: init,
                redConnector,
                distortionCallback(v) {
                    return v;
                },
            });

            const redValue = {};
            const endowments = {
                0: 'foo',
            };

            ve.remap(redValue, getFilteredEndowmentDescriptors(endowments));

            expect(Object.getOwnPropertyNames(redValue).length).toBe(0);
        });
        it('Skips untamable properties, ie. descriptor is not configurable', () => {
            // Ignoring "Property 'assertions' does not exist on type '{...}'."
            // @ts-ignore
            expect.assertions(1);

            const initSourceText = `(function(){'use strict';return (${init.toString()})})()`;
            // eslint-disable-next-line no-eval
            const redConnector = globalThis.eval(initSourceText);

            const ve = new VirtualEnvironment({
                blueConnector: init,
                redConnector,
                distortionCallback(v) {
                    return v;
                },
            });

            const redValue = {} as any;
            Object.defineProperty(redValue, 'p', {
                value: 0,
                configurable: false,
            });
            const endowments = {
                p: 1,
            };

            ve.remap(redValue, getFilteredEndowmentDescriptors(endowments));

            expect(redValue.p).toBe(0);
        });

        it('calls a lazy endowment getter', () => {
            // Ignoring "Property 'assertions' does not exist on type '{...}'."
            // @ts-ignore
            expect.assertions(3);

            let count = 0;

            const initSourceText = `(function(){'use strict';return (${init.toString()})})()`;
            // istanbul ignore next
            // eslint-disable-next-line no-eval
            const redConnector = globalThis.eval(initSourceText);

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

            const endowments = {};

            Object.defineProperty(endowments, 'p', {
                get() {
                    count += 1;
                    return 1;
                },
                configurable: true,
            });

            ve.remap(globalThis, getFilteredEndowmentDescriptors(endowments));

            expect(globalThis.p).toBe(1);
            expect(count).toBe(3);
        });

        it('calls a lazy endowment setter', () => {
            // Ignoring "Property 'assertions' does not exist on type '{...}'."
            // @ts-ignore
            expect.assertions(7);

            let count = 0;
            let blueSetValue = null;

            const initSourceText = `(function(){'use strict';return (${init.toString()})})()`;
            // eslint-disable-next-line no-eval
            const redConnector = globalThis.eval(initSourceText);

            const ve = new VirtualEnvironment({
                blueConnector: init,
                redConnector,
                distortionCallback(v) {
                    return v;
                },
            });

            const endowments = {};
            Object.defineProperty(endowments, 'p', {
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

            ve.remap(globalThis, getFilteredEndowmentDescriptors(endowments));

            expect(globalThis.p).toBe(1); // count + 1
            expect(globalThis.p).toBe(1); // count + 1
            expect(globalThis.p).toBe(1); // count + 1
            expect(count).toBe(3);
            globalThis.p = 99;
            expect(globalThis.p).toBe(1);
            expect(blueSetValue).toBe(99);
            expect(count).toBe(6);
        });
    });
});
