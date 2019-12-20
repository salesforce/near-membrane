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
        const secureGlobalThis = createSecureEnvironment((v) => v);
        secureGlobalThis.eval(`foo.expose(() => { foo.a })`);
        expect(() => {
            sandboxedValue();
        }).toThrowError(Error);
        secureGlobalThis.eval(`foo.expose(() => { foo.a = 1; })`);
        expect(() => {
            sandboxedValue();
        }).toThrowError(Error);
        secureGlobalThis.eval(`foo.expose(() => { foo.b(2); })`);
        expect(() => {
            sandboxedValue();
        }).toThrowError(RangeError);
    });
    it('should remap the Outer Realm Error instance to the sandbox errors', function() {
        const secureGlobalThis = createSecureEnvironment((v) => v);
        expect(() => {
            secureGlobalThis.eval(`
                try {
                    foo.a;
                } catch (e) {
                    if (!(e instanceof Error)) {
                        throw new Error('Invalid Error Identity');
                    }
                }
            `);
        }).not.toThrowError();
        expect(() => {
            secureGlobalThis.eval(`
                try {
                    foo.a = 1;
                } catch (e) {
                    if (!(e instanceof Error)) {
                        throw new Error('Invalid Error Identity');
                    }
                }
            `);
        }).not.toThrowError();
        expect(() => {
            secureGlobalThis.eval(`
                try {
                    foo.b(2);
                } catch (e) {
                    if (!(e instanceof RangeError)) {
                        throw new Error('Invalid Error Identity');
                    }
                }
            `);
        }).not.toThrowError();
    });
    it('should capture throwing from user proxy', function() {
        const secureGlobalThis = createSecureEnvironment((v) => v);
        secureGlobalThis.eval(`
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
});
