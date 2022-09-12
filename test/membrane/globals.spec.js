import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('sandbox', () => {
    const envOptions = {
        globalObjectShape: window,
    };

    it('should allow creation of sandboxed global expandos', () => {
        expect.assertions(3);

        const env = createVirtualEnvironment(window, envOptions);

        env.evaluate(`
            window.s1 = 'a';
            expect(s1).toBe('a');
        `);

        expect(window.s1).toBe(undefined);

        env.evaluate(`
            // Access globals across different eval calls.
            expect(s1).toBe('a');
        `);
    });
    it('should allow the shadowing of existing globals', () => {
        expect.assertions(4);

        window.s2 = 'b';

        const env = createVirtualEnvironment(window, envOptions);

        env.evaluate(`
            expect(s2).toBe('b');
            window.s2 = 'c';
            expect(s2).toBe('c');
        `);

        expect(window.s2).toBe('b');

        env.evaluate(`
            // Access global shadows across different eval calls.
            expect(s2).toBe('c');
        `);
    });
    it('should not observe lazy global descriptors', () => {
        expect.assertions(44);

        const env = createVirtualEnvironment(window, envOptions);

        env.evaluate(`
            expect(Object.prototype.__defineGetter__.name).toBe('__defineGetter__');
            expect(Object.prototype.__defineGetter__.length).toBe(2);
            expect(Object.prototype.__defineGetter__.toString()).toContain('[native code]');

            const emptyAccessor = () => {};
            window.__defineGetter__('ArrayBuffer', emptyAccessor);
            expect(window.__lookupGetter__('ArrayBuffer')).toBe(emptyAccessor);

            expect(Object.prototype.__defineSetter__.name).toBe('__defineSetter__');
            expect(Object.prototype.__defineSetter__.length).toBe(2);
            expect(Object.prototype.__defineSetter__.toString()).toContain('[native code]');

            window.__defineSetter__('Atomics', emptyAccessor);
            expect(window.__lookupSetter__('Atomics')).toBe(emptyAccessor);

            expect(Object.prototype.__lookupGetter__.name).toBe('__lookupGetter__');
            expect(Object.prototype.__lookupGetter__.length).toBe(1);
            expect(Object.prototype.__lookupGetter__.toString()).toContain('[native code]');

            expect(window.__lookupGetter__('Date')).not.toBeDefined();

            expect(Object.prototype.__lookupSetter__.name).toBe('__lookupSetter__');
            expect(Object.prototype.__lookupSetter__.length).toBe(1);
            expect(Object.prototype.__lookupSetter__.toString()).toContain('[native code]');

            expect(window.__lookupGetter__('Int8Array')).not.toBeDefined();

            expect(Reflect.defineProperty.name).toBe('defineProperty');
            expect(Reflect.defineProperty.length).toBe(3);
            expect(Reflect.defineProperty.toString()).toContain('[native code]');

            const customInt16ArrayDesc = {
                configurable: true,
                enumerable: true,
                value: 'customized',
                writable: true,
            };

            expect(Reflect.defineProperty(window, 'Int16Array', customInt16ArrayDesc)).toBe(true);
            expect(Reflect.getOwnPropertyDescriptor(window, 'Int16Array')).toEqual(
                customInt16ArrayDesc
            );

            expect(Reflect.getOwnPropertyDescriptor.name).toBe('getOwnPropertyDescriptor');
            expect(Reflect.getOwnPropertyDescriptor.length).toBe(2);
            expect(Reflect.getOwnPropertyDescriptor.toString()).toContain('[native code]');
            expect(Reflect.getOwnPropertyDescriptor(window, 'Map')).toEqual({
                configurable: true,
                enumerable: false,
                value: Map,
                writable: true,
            });
            expect(Object.getOwnPropertyDescriptor.name).toBe('getOwnPropertyDescriptor');
            expect(Object.getOwnPropertyDescriptor.length).toBe(2);
            expect(Object.getOwnPropertyDescriptor.toString()).toContain('[native code]');
            expect(Object.getOwnPropertyDescriptor(window, 'Promise')).toEqual({
                configurable: true,
                enumerable: false,
                value: Promise,
                writable: true,
            });
            expect(Object.getOwnPropertyDescriptors.name).toBe('getOwnPropertyDescriptors');
            expect(Object.getOwnPropertyDescriptors.length).toBe(1);
            expect(Object.getOwnPropertyDescriptors.toString()).toContain('[native code]');

            // Chromium based browsers have a bug that nulls the result of window
            // getters in detached iframes when the property descriptor of window.window
            // is retrieved.
            // https://bugs.chromium.org/p/chromium/issues/detail?id=1305302
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

            const setDesc = {
                configurable: true,
                enumerable: false,
                value: Set,
                writable: true,
            };

            expect(Object.getOwnPropertyDescriptors(globalThis).Set).toEqual(setDesc);
            expect(Object.getOwnPropertyDescriptors(window).Set).toEqual(setDesc);

            expect(window.propertyIsEnumerable('WeakMap')).toBe(false);

            expect(window.__lookupGetter__('globalThis')).toBe(window.__lookupGetter__('globalThis'));
            expect(window.__lookupGetter__('window')).toBe(window.__lookupGetter__('window'));

            expect(window.propertyIsEnumerable('WeakSet')).toBe(false);
        `);
    });
});
