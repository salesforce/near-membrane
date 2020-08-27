import createSecureEnvironment from "../../lib/browser-realm.js";

describe("async/await", () => {
    it("basic wrapping", (done) => {
        const evalScript = createSecureEnvironment({ endowments: { done, expect }});
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
