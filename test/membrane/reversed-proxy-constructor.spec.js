import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('Reversed Proxy constructor', () => {
    it('can be constructed', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({
                test({ Proxy }) {
                    const p = new Proxy(
                        {},
                        {
                            get() {
                                return 1;
                            },
                        }
                    );
                    expect(p.a).toBe(1);
                },
            }),
        });

        env.evaluate(`test({ Proxy });`);
    });
    it('.revocable() should be supported', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({
                test({ Proxy }) {
                    const { proxy, revoke } = Proxy.revocable(
                        {},
                        {
                            get() {
                                return 1;
                            },
                        }
                    );
                    expect(proxy.a).toBe(1);
                    revoke();
                    expect(() => proxy.a).toThrowError(TypeError);
                },
            }),
        });

        env.evaluate(`test({ Proxy });`);
    });
});
