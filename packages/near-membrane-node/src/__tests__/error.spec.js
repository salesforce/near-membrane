import createVirtualEnvironment from '@locker/near-membrane-node';

function throwNewError(Ctor, msg) {
    throw new Ctor(msg);
}

let sandboxedValue;

const foo = {
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
    it('should preserve identity of errors after a membrane roundtrip', () => {
        expect.assertions(3);

        const env = createVirtualEnvironment(globalThis, {
            endowments: Object.getOwnPropertyDescriptors({ foo }),
            globalObjectShape: globalThis,
        });

        env.evaluate(`foo.expose(() => { foo.a })`);

        expect(() => {
            sandboxedValue();
        }).toThrowError(Error);

        env.evaluate(`foo.expose(() => { foo.a = 1; })`);

        expect(() => {
            sandboxedValue();
        }).toThrowError(Error);

        env.evaluate(`foo.expose(() => { foo.b(2); })`);

        expect(() => {
            sandboxedValue();
        }).toThrowError(RangeError);
    });
    it('should remap the blue realm error instance to the sandbox errors', () => {
        expect.assertions(3);

        const env = createVirtualEnvironment(globalThis, {
            endowments: Object.getOwnPropertyDescriptors({ expect, foo }),
            globalObjectShape: globalThis,
        });

        env.evaluate(`
            expect(() => {
                foo.a;
            }).toThrowError(Error);
        `);
        env.evaluate(`
            expect(() => {
                foo.a = 1;
            }).toThrowError(Error);
        `);
        env.evaluate(`
            expect(() => {
                foo.b(2);
            }).toThrowError(RangeError);
        `);
    });
    it('should capture throwing from user proxy', () => {
        expect.assertions(3);

        const env = createVirtualEnvironment(globalThis, {
            endowments: Object.getOwnPropertyDescriptors({ foo }),
            globalObjectShape: globalThis,
        });

        env.evaluate(`
            const revocable = Proxy.revocable(() => undefined, {});
            revocable.revoke();
            foo.expose(revocable.proxy);
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
        const env = createVirtualEnvironment(globalThis, {
            endowments: Object.getOwnPropertyDescriptors({ foo }),
            globalObjectShape: globalThis,
        });

        expect(() => {
            env.evaluate(`
                throw new TypeError('from sandbox');
            `);
        }).toThrowError(TypeError);
    });
    it('should protect from leaking sandbox errors during parsing', () => {
        const env = createVirtualEnvironment(globalThis, {
            endowments: Object.getOwnPropertyDescriptors({ foo }),
            globalObjectShape: globalThis,
        });

        expect(() => {
            env.evaluate(`
                return; // illegal return statement
            `);
        }).toThrowError(SyntaxError);
    });
});
