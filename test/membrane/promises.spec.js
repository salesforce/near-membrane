import createSecureEnvironment from "../../lib/browser-realm.js";

describe("Promise", () => {
  it("should settle in 10ms", (done) => {
    const evalScript = createSecureEnvironment(undefined, { done });
    evalScript(`
        function promise() {
            return new Promise(resolve => {
                setTimeout(resolve, 10);
            });
        }
        promise().then(() => {
            done();
        });
    `);
    setTimeout(() => {
      done(new Error("Promise was not fulfilled in 10ms"));
    }, 100);
  });
});
