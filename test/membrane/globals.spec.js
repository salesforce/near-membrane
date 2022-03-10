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
        expect.assertions(14);

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

            // Chrome has a JIT bug when working with a detached iframe and
            // Object.getOwnPropertyDescriptors(window) that causes window to
            // delete itself. By performing this empty loop we knock the bug
            // out and the tests after the Object.getOwnPropertyDescriptors(window)
            // call will pass.
            for (const key of Reflect.ownKeys(window)) {}

            expect(Object.getOwnPropertyDescriptors(window).Map).toEqual({
                configurable: true,
                enumerable: false,
                value: Map,
                writable: true,
            });

            expect(window.propertyIsEnumerable('length')).toBe(true);
            expect(window.propertyIsEnumerable('window')).toBe(true);
        `);
    });
});
