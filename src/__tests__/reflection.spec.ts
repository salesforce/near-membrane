import { evaluateScriptSource } from '../node-realm';

const endowments = {
    foo: {
        b() {},
        e: new Error(),
    },
    expect,
};

describe('Reflective Intrinsic Objects', () => {
    it('should preserve identity of Object thru membrane', function() {
        expect.assertions(2);
        evaluateScriptSource(`
            const o = {};
            expect(foo instanceof Object).toBe(true);
            expect(o instanceof Object).toBe(true);
        `, { endowments });
    });
    it('should preserve identity of Function thru membrane', function() {
        expect.assertions(2);
        evaluateScriptSource(`
            function x() {}
            expect(foo.b instanceof Function).toBe(true);
            expect(x instanceof Function).toBe(true);
        `, { endowments });
    });
    it('should preserve identity of Error thru membrane', function() {
        expect.assertions(2);
        evaluateScriptSource(`
            const e = new Error();
            expect(foo.e instanceof Error).toBe(true);
            expect(e instanceof Error).toBe(true);
        `, { endowments, });
    });
});
