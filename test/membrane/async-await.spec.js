import createVirtualEnvironment from "@locker/near-membrane-dom";

// TODO #115 - Skip Firefox until we find a non-compiler based solution for them
if (!navigator.userAgent.includes('Firefox/')) {
    describe("async/await", () => {
        it("basic wrapping", (done) => {
            const evalScript = createVirtualEnvironment({ endowments: { done, expect }});
            evalScript(`
                async function hello() {
                    return await "Hello";
                }
                hello().then((value) => {
                    expect(value).toBe("Hello");
                    done();
                });
            `);
        });
    });
}
