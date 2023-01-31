import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('get trap', () => {
    it('does retrieve values when missing a getOwnPropertyDescriptor trap', () => {
        const env = createVirtualEnvironment(window);
        const get = env.evaluate('(object, key) => object[key]');
        const proxiedObject = new Proxy(
            {},
            {
                get() {
                    return 1;
                },
            }
        );
        const proxiedTypedArray = new Proxy(new Uint8Array(), {
            get() {
                return 1;
            },
        });
        expect(get(proxiedObject, 'a')).toBe(1);
        expect(get(proxiedTypedArray, 'a')).toBe(1);
    });
});
