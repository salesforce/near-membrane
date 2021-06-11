import { VirtualEnvironment } from '../environment';

describe('VirtualEnvironment', () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    it('throws when options bag is missing', () => {
        expect.assertions(1);
        expect(() => {
            // @ts-ignore
            // eslint-disable-next-line no-new
            new VirtualEnvironment();
        }).toThrow(/Missing VirtualEnvironmentOptions options bag/);
    });
    describe('VirtualEnvironment.prototype.remap', () => {
        it('Skips index-like properties', () => {
            expect.assertions(1);

            const ve = new VirtualEnvironment({
                blueGlobalThis: globalThis,
                redGlobalThis: globalThis,
                distortionCallback(v) {
                    return v;
                },
            });

            const redValue = {};
            const blueValue = {};
            const blueDescriptors = {
                0: {
                    value: 1,
                },
            };

            ve.remap(redValue, blueValue, blueDescriptors);

            expect(Object.getOwnPropertyNames(redValue).length).toBe(0);
        });
        it('Skips untamable properties, ie. descriptor is not configurable', () => {
            expect.assertions(2);

            console.warn = jest.fn();

            const ve = new VirtualEnvironment({
                blueGlobalThis: globalThis,
                redGlobalThis: globalThis,
                distortionCallback(v) {
                    return v;
                },
            });

            const redValue = {} as any;
            Object.defineProperty(redValue, 'p', {
                value: 0,
                configurable: false,
            });
            const blueValue = {};
            const blueDescriptors = {
                p: {
                    value: 1,
                },
            };
            ve.remap(redValue, blueValue, blueDescriptors);
            expect(redValue.p).toBe(0);
            expect(console.warn).toBeCalled();
        });

        it('calls the lazy blue getter', () => {
            expect.assertions(3);

            let count = 0;

            const redValue = {} as any;
            const blueValue = {};
            const blueDescriptors = {
                p: {
                    get() {
                        count += 1;
                        return 1;
                    },
                },
            };

            const ve = new VirtualEnvironment({
                blueGlobalThis: globalThis,
                redGlobalThis: globalThis,
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

            ve.remap(redValue, blueValue, blueDescriptors);

            expect(redValue.p).toBe(1);
            expect(count).toBe(3);
        });

        it('calls the lazy blue setter', () => {
            expect.assertions(7);

            let count = 0;
            let blueSetValue = null;

            const redValue = {} as any;
            const blueValue = {};
            const blueDescriptors = {
                p: {
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
                },
            };

            const ve = new VirtualEnvironment({
                blueGlobalThis: globalThis,
                redGlobalThis: globalThis,
                distortionCallback(v) {
                    return v;
                },
            });

            ve.remap(redValue, blueValue, blueDescriptors);

            expect(redValue.p).toBe(1); // count + 1
            expect(redValue.p).toBe(1); // count + 1
            expect(redValue.p).toBe(1); // count + 1
            expect(count).toBe(3);
            redValue.p = 2;
            expect(redValue.p).toBe(2); // count will not be changed!
            expect(count).toBe(3);
            expect(blueSetValue).toBe(null);
        });
    });
});
