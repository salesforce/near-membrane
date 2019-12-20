import createSecureEnvironment from '../node-realm';

globalThis.foo = {
    b() {},
    e: new Error(),
};

describe('Reflective Intrinsic Objects', () => {
    it('should preserve identity of Object thru membrane', function() {
        const secureGlobalThis = createSecureEnvironment((v) => v);
        expect(() => {
            secureGlobalThis.eval(`
                if (!(foo instanceof Object)) {
                    throw new Error('Invalid Identity of foo');
                }
                const o = {};
                if (!(o instanceof Object)) {
                    throw new Error('Invalid Identity of o');
                }
            `);
        }).not.toThrowError();
    });
    it('should preserve identity of Function thru membrane', function() {
        const secureGlobalThis = createSecureEnvironment((v) => v);
        expect(() => {
            secureGlobalThis.eval(`
                if (!(foo.b instanceof Function)) {
                    throw new Error('Invalid Identity of foo.b');
                }
                function x() {}
                if (!(x instanceof Function)) {
                    throw new Error('Invalid Identity of x');
                }
            `);
        }).not.toThrowError();
    });
    it('should preserve identity of Error thru membrane', function() {
        const secureGlobalThis = createSecureEnvironment((v) => v);
        expect(() => {
            secureGlobalThis.eval(`
                if (!(foo.e instanceof Error)) {
                    throw new Error('Invalid Identity of foo.e');
                }
                const e = new Error();
                if (!(e instanceof Error)) {
                    throw new Error('Invalid Identity of e');
                }
            `);
        }).not.toThrowError();
    });
});
