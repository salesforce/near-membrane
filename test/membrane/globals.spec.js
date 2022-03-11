import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('sandbox', () => {
    it('should allow creation of sandboxed global expandos', () => {
        expect.assertions(3);

        const env = createVirtualEnvironment(window, window);

        env.evaluate(`
            window.s1 = 'a';
            expect(s1).toBe('a');
        `);

        expect(window.s1).toBe(undefined);

        env.evaluate(`
            // reusing globals across different eval calls
            expect(s1).toBe('a');
        `);
    });
    it('should allow the shadowing of existing globals', () => {
        expect.assertions(4);

        window.s2 = 'b';

        const env = createVirtualEnvironment(window, window);

        env.evaluate(`
            expect(s2).toBe('b');
            window.s2 = 'c';
            expect(s2).toBe('c');
        `);

        expect(window.s2).toBe('b');

        env.evaluate(`
            // reusing global shadows across different eval calls
            expect(s2).toBe('c');
        `);
    });
    it('should not observe lazy global descriptors', () => {
        expect.assertions(20);

        const env = createVirtualEnvironment(window, window);

        env.evaluate(`
            expect(Reflect.getOwnPropertyDescriptor.name).toBe('getOwnPropertyDescriptor');
            expect(Reflect.getOwnPropertyDescriptor.length).toBe(2);
            expect(Reflect.getOwnPropertyDescriptor.toString()).toContain('[native code]');
            expect(Reflect.getOwnPropertyDescriptor(window, 'ArrayBuffer')).toEqual({
                configurable: true,
                enumerable: false,
                value: ArrayBuffer,
                writable: true,
            });
            expect(Object.getOwnPropertyDescriptor.name).toBe('getOwnPropertyDescriptor');
            expect(Object.getOwnPropertyDescriptor.length).toBe(2);
            expect(Object.getOwnPropertyDescriptor.toString()).toContain('[native code]');
            expect(Object.getOwnPropertyDescriptor(window, 'Date')).toEqual({
                configurable: true,
                enumerable: false,
                value: Date,
                writable: true,
            });
            expect(Object.getOwnPropertyDescriptors.name).toBe('getOwnPropertyDescriptors');
            expect(Object.getOwnPropertyDescriptors.length).toBe(1);
            expect(Object.getOwnPropertyDescriptors.toString()).toContain('[native code]');

            const globalThisDescMatcher = jasmine.objectContaining({
                configurable: true,
                enumerable: false,
            });

            const winDescMatcher = jasmine.objectContaining({
                configurable: false,
                enumerable: true,
            });

            expect(Reflect.getOwnPropertyDescriptor(window, 'globalThis')).toEqual(
                globalThisDescMatcher
            );
            expect(Reflect.getOwnPropertyDescriptor(window, 'window')).toEqual(
                winDescMatcher
            );

            expect(window.propertyIsEnumerable('length')).toBe(true);

            expect(Object.getOwnPropertyDescriptor(window, 'globalThis')).toEqual(
                globalThisDescMatcher
            );
            expect(Object.getOwnPropertyDescriptor(window, 'window')).toEqual(
                winDescMatcher
            );

            expect(window.propertyIsEnumerable('window')).toBe(true);

            const mapDesc = {
                configurable: true,
                enumerable: false,
                value: Map,
                writable: true,
            };

            expect(Object.getOwnPropertyDescriptors(globalThis).Map).toEqual(mapDesc);
            expect(Object.getOwnPropertyDescriptors(window).Map).toEqual(mapDesc);

            expect(window.propertyIsEnumerable('Set')).toBe(false);
        `);
    });
});
