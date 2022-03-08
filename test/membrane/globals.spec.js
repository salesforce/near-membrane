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
        expect.assertions(12);

        const env = createVirtualEnvironment(window, window);
        env.evaluate(`
            const ArrayBufferDesc = {
                configurable: true,
                enumerable: false,
                value: ArrayBuffer,
                writable: true,
            };
            expect(Reflect.getOwnPropertyDescriptor.name).toBe('getOwnPropertyDescriptor');
            expect(Reflect.getOwnPropertyDescriptor.length).toBe(2);
            expect(Reflect.getOwnPropertyDescriptor.toString()).toContain('[native code]');
            expect(Reflect.getOwnPropertyDescriptor(window, 'ArrayBuffer')).toEqual(
                ArrayBufferDesc
            );
            expect(Object.getOwnPropertyDescriptor.name).toBe('getOwnPropertyDescriptor');
            expect(Object.getOwnPropertyDescriptor.length).toBe(2);
            expect(Object.getOwnPropertyDescriptor.toString()).toContain('[native code]');
            expect(Object.getOwnPropertyDescriptor(window, 'ArrayBuffer')).toEqual(
                ArrayBufferDesc
            );
            expect(Object.getOwnPropertyDescriptors.name).toBe('getOwnPropertyDescriptors');
            expect(Object.getOwnPropertyDescriptors.length).toBe(1);
            expect(Object.getOwnPropertyDescriptors.toString()).toContain('[native code]');
            expect(Object.getOwnPropertyDescriptors(window).ArrayBuffer).toEqual(
                ArrayBufferDesc
            );
        `);
    });
});
