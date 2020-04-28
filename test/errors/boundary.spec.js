import { evaluateSourceText } from '../../lib/browser-realm.js';

function throwNewError(Ctor, msg) {
    throw new Ctor(msg);
}

let sandboxedValue;

const endowments = {
    boundaryHooks: {
        set a(v) {
            throwNewError(Error, 'a() setter throws for argument: ' + v);
        },
        get a() {
            return throwNewError(Error, 'a() getter throws');
        },
        b(v) {
            throwNewError(RangeError, 'b() method throws for argument: ' + v);
        },
        expose(fn) {
            sandboxedValue = fn;
        }
    },
    expect,
};

describe('The Error Boundary', () => {
    it('should preserve identity of errors after a membrane roundtrip', function() {
        // expect.assertions(3);
        evaluateSourceText(`boundaryHooks.expose(() => { boundaryHooks.a })`, {
            endowments
        });
        expect(() => {
            sandboxedValue();
        }).toThrowError(Error);
        evaluateSourceText(`boundaryHooks.expose(() => { boundaryHooks.a = 1; })`, {
            endowments
        });
        expect(() => {
            sandboxedValue();
        }).toThrowError(Error);
        evaluateSourceText(`boundaryHooks.expose(() => { boundaryHooks.b(2); })`, {
            endowments
        });
        expect(() => {
            sandboxedValue();
        }).toThrowError(RangeError);
    });
    it('should remap the Outer Realm Error instance to the sandbox errors', function() {
        // expect.assertions(3);
        evaluateSourceText(`
            expect(() => {
                boundaryHooks.a;
            }).toThrowError(Error);
        `, { endowments });
        evaluateSourceText(`
            expect(() => {
                boundaryHooks.a = 1;
            }).toThrowError(Error);
        `, { endowments });
        evaluateSourceText(`
            expect(() => {
                boundaryHooks.b(2);
            }).toThrowError(RangeError);
        `, { endowments });
    });
    it('should capture throwing from user proxy', function() {
        // expect.assertions(3);
        evaluateSourceText(`
            const revocable = Proxy.revocable(() => undefined, {});
            revocable.revoke();
            boundaryHooks.expose(revocable.proxy);
        `, { endowments });
        expect(() => {
            sandboxedValue.x;
        }).toThrowError(Error);
        expect(() => {
            sandboxedValue.x = 1;
        }).toThrowError(Error);
        expect(() => {
            delete sandboxedValue.x;
        }).toThrowError(Error);
    });
    it('should protect from leaking sandbox errors during evaluation', function() {
        expect(() => {
            evaluateSourceText(`
                throw new TypeError('from sandbox');
            `);
        }).toThrowError(TypeError);
    });
    it('should protect from leaking sandbox errors during parsing', function() {
        expect(() => {
            evaluateSourceText(`
                return; // illegal return statement
            `);
        }).toThrowError(SyntaxError);
    });
});
