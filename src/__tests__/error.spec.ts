import createSecureEnvironment from '../node-realm';

function throwNewError(Ctor, msg) {
    throw new Ctor(msg);
}

let sandboxedFn;

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
        sandboxedFn = fn;
    }
};

describe('The Error Boundary', () => {
    it('should preserve identity of errors after a membrane roundtrip', function() {
        const secureGlobalThis = createSecureEnvironment((v) => v);
        secureGlobalThis.eval(`foo.expose(() => { foo.a })`);
        expect(() => {
            sandboxedFn();
        }).toThrowError(Error);
        secureGlobalThis.eval(`foo.expose(() => { foo.a = 1; })`);
        expect(() => {
            sandboxedFn();
        }).toThrowError(Error);
        secureGlobalThis.eval(`foo.expose(() => { foo.b(2); })`);
        expect(() => {
            sandboxedFn();
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
});
