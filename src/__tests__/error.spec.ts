import createSecureEnvironment from '../node-realm';

function throwNewError(Ctor, msg) {
    throw new Ctor(msg);
}

let sandboxedValue;

globalThis.foo = {
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
};

describe('The Error Boundary', () => {
    it('should preserve identity of errors after a membrane roundtrip', function() {
        expect.assertions(3);
        const evalScript = createSecureEnvironment({ endowments: window });
        evalScript(`foo.expose(() => { foo.a })`);
        expect(() => {
            sandboxedValue();
        }).toThrowError(Error);
        evalScript(`foo.expose(() => { foo.a = 1; })`);
        expect(() => {
            sandboxedValue();
        }).toThrowError(Error);
        evalScript(`foo.expose(() => { foo.b(2); })`);
        expect(() => {
            sandboxedValue();
        }).toThrowError(RangeError);
    });
    it('should remap the Blue Realm Error instance to the sandbox errors', function() {
        expect.assertions(3);
        const evalScript = createSecureEnvironment({ endowments: window });

        evalScript(`
            expect(() => {
                foo.a;
            }).toThrowError(Error);
        `);
        evalScript(`
            expect(() => {
                foo.a = 1;
            }).toThrowError(Error);
        `);
        evalScript(`
            expect(() => {
                foo.b(2);
            }).toThrowError(RangeError);
        `);
    });
    it('should capture throwing from user proxy', function() {
        expect.assertions(3);
        const evalScript = createSecureEnvironment({ endowments: window });
        evalScript(`
            const revocable = Proxy.revocable(() => undefined, {});
            revocable.revoke();
            foo.expose(revocable.proxy);
        `);
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
        const evalScript = createSecureEnvironment({ endowments: window });
        
        expect(() => {
            evalScript(`
                throw new TypeError('from sandbox');
            `);
        }).toThrowError(TypeError);
    });
    it('should protect from leaking sandbox errors during parsing', function() {
        const evalScript = createSecureEnvironment({ endowments: window });

        expect(() => {
            evalScript(`
                return; // illegal return statement
            `);
        }).toThrowError(SyntaxError);
    });
});
