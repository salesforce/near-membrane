import createVirtualEnvironment from '@locker/near-membrane-dom';

function throwNewError(Ctor, msg) {
    throw new Ctor(msg);
}

let sandboxedValue;

const boundaryHooks = {
    set a(v) {
        throwNewError(Error, `a() setter throws for argument: ${v}`);
    },
    get a() {
        return throwNewError(Error, 'a() getter throws');
    },
    b(v) {
        throwNewError(RangeError, `b() method throws for argument: ${v}`);
    },
    expose(fn) {
        sandboxedValue = fn;
    },
};

describe('The Error Boundary', () => {
    const envOptions = {
        globalObjectShape: window,
    };

    it('should preserve identity of errors after a membrane roundtrip', () => {
        expect.assertions(3);

        window.boundaryHooks = boundaryHooks;

        const env = createVirtualEnvironment(window, envOptions);

        env.evaluate(`boundaryHooks.expose(() => { boundaryHooks.a })`);

        expect(() => {
            sandboxedValue();
        }).toThrowError(Error);

        env.evaluate(`boundaryHooks.expose(() => { boundaryHooks.a = 1; })`);

        expect(() => {
            sandboxedValue();
        }).toThrowError(Error);

        env.evaluate(`boundaryHooks.expose(() => { boundaryHooks.b(2); })`);

        expect(() => {
            sandboxedValue();
        }).toThrowError(RangeError);
    });
    it('should remap the Outer Realm Error instance to the sandbox errors', () => {
        expect.assertions(3);

        window.boundaryHooks = boundaryHooks;

        const env = createVirtualEnvironment(window, envOptions);

        env.evaluate(`
            expect(() => {
                boundaryHooks.a;
            }).toThrowError(Error);
        `);
        env.evaluate(`
            expect(() => {
                boundaryHooks.a = 1;
            }).toThrowError(Error);
        `);
        env.evaluate(`
            expect(() => {
                boundaryHooks.b(2);
            }).toThrowError(RangeError);
        `);
    });
    it('should capture throwing from user proxy', () => {
        expect.assertions(3);

        window.boundaryHooks = boundaryHooks;

        const env = createVirtualEnvironment(window, envOptions);

        env.evaluate(`
            const revocable = Proxy.revocable(() => undefined, {});
            revocable.revoke();
            boundaryHooks.expose(revocable.proxy);
        `);

        expect(() => {
            // eslint-disable-next-line no-unused-expressions
            sandboxedValue.x;
        }).toThrowError(Error);
        expect(() => {
            sandboxedValue.x = 1;
        }).toThrowError(Error);
        expect(() => {
            delete sandboxedValue.x;
        }).toThrowError(Error);
    });
    it('should protect from leaking sandbox errors during evaluation', () => {
        const env = createVirtualEnvironment(window);

        expect(() => {
            env.evaluate(`
                throw new TypeError('from sandbox');
            `);
        }).toThrowError(TypeError);
    });
    it('should protect from leaking sandbox errors during parsing', () => {
        const env = createVirtualEnvironment(window);

        expect(() => {
            env.evaluate(`
                return; // illegal return statement
            `);
        }).toThrowError(SyntaxError);
    });
});
