import { evaluateScriptSource } from '../node-realm';

function throwNewError(Ctor, msg) {
    throw new Ctor(msg);
}

let sandboxedValue;

const endowments = {
    foo: {
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
        expect.assertions(3);
        evaluateScriptSource(`foo.expose(() => { foo.a })`, { endowments });
        expect(() => {
            sandboxedValue();
        }).toThrowError(Error);
        evaluateScriptSource(`foo.expose(() => { foo.a = 1; })`, { endowments });
        expect(() => {
            sandboxedValue();
        }).toThrowError(Error);
        evaluateScriptSource(`foo.expose(() => { foo.b(2); })`, { endowments });
        expect(() => {
            sandboxedValue();
        }).toThrowError(RangeError);
    });
    it('should remap the Blue Realm Error instance to the sandbox errors', function() {
        expect.assertions(3);
        evaluateScriptSource(`
            expect(() => {
                foo.a;
            }).toThrowError(Error);
        `, { endowments } );
        evaluateScriptSource(`
            expect(() => {
                foo.a = 1;
            }).toThrowError(Error);
        `, { endowments });
        evaluateScriptSource(`
            expect(() => {
                foo.b(2);
            }).toThrowError(RangeError);
        `, { endowments });
    });
    it('should capture throwing from user proxy', function() {
        expect.assertions(3);
        evaluateScriptSource(`
            const revocable = Proxy.revocable(() => undefined, {});
            revocable.revoke();
            foo.expose(revocable.proxy);
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
            evaluateScriptSource(`
                throw new TypeError('from sandbox');
            `, { endowments });
        }).toThrowError(TypeError);
    });
    it('should protect from leaking sandbox errors during parsing', function() {
        expect(() => {
            evaluateScriptSource(`
                return; // illegal return statement
            `, { endowments });
        }).toThrowError(SyntaxError);
    });
});
