import createSecureEnvironment from "@locker/near-membrane-dom";

describe("Reversed Proxy constructor", () => {
    it("can be constructed", () => {
        const evalScript = createSecureEnvironment({
            endowments: {
                test({ Proxy }) {
                    const p = new Proxy({}, {
                        get() { return 1 }
                    });
                    expect(p.a).toBe(1);
                },
            },
        });
        evalScript(`test({ Proxy });`);
    });
    it(".revocable() should be supported", () => {
        const evalScript = createSecureEnvironment({
            endowments: {
                test({ Proxy }) {
                    const { proxy, revoke } = Proxy.revocable({}, {
                        get() { return 1 }
                    });
                    expect(proxy.a).toBe(1);
                    revoke();
                    expect(() => proxy.a).toThrowError(TypeError);
                },
            },
        });
        evalScript(`test({ Proxy });`);
    });
});
