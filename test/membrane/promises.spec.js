import createSecureEnvironment from "../../lib/browser-realm.js";

describe("Promise", () => {
    it("can be constructed", (done) => {
        const evalScript = createSecureEnvironment({ endowments: { done, expect }});
        evalScript(`
            const p = new Promise(resolve => {
                resolve(1);
            });
            p.then((value) => {
                expect(value).toBe(1);
                done();
            });
        `);
    });
    it(".resolve() should be supported", (done) => {
        const evalScript = createSecureEnvironment({ endowments: { done, expect }});
        evalScript(`
            const p = Promise.resolve(1);
            p.then((value) => {
                expect(value).toBe(1);
                done();
            });
        `);
    });
    it(".reject() should be supported", (done) => {
        const evalScript = createSecureEnvironment({ endowments: { done, expect }});
        evalScript(`
            const p = Promise.reject(new Error('foo'));
            p.catch((e) => {
                expect(e.message).toBe('foo');
                done();
            });
        `);
    });
    it("throw should be supported with errors", (done) => {
        const evalScript = createSecureEnvironment({ endowments: { done, expect }});
        evalScript(`
            const p = new Promise(() => {
                throw new Error('foo');
            });
            p.catch((e) => {
                expect(e.message).toBe('foo');
                done();
            });
        `);
    });
    it("throw should be supported with non-errors", (done) => {
        const evalScript = createSecureEnvironment({ endowments: { done, expect }});
        evalScript(`
            const p = new Promise(() => {
                throw { foo: 'bar' };
            });
            p.catch((e) => {
                expect(e).toEqual({ foo: 'bar' });
                done();
            });
        `);
    });
});
