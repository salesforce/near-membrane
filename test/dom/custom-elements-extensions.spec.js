import createVirtualEnvironment from '@locker/near-membrane-dom';

// outer element declaration
class Base extends HTMLElement {}
customElements.define('x-base', Base);

describe('Extending Custom Element', () => {

    const evalScript = createVirtualEnvironment({ endowments: window });

    it('should be allowed from blue to red', function() {
        // expect.assertions(1);
        evalScript(`
            const Base = customElements.get('x-base');
            customElements.define('x-red-base', class extends Base {});
            const elm = document.createElement('x-red-base');
            expect(elm instanceof Base).toBe(true);
        `);
    });
    it('should be allowed in red', function() {
        // expect.assertions(1);
        evalScript(`
            class Red extends HTMLElement {}
            customElements.define('x-red', Red);
            const elm = document.createElement('x-red');
            expect(elm instanceof Red).toBe(true);
        `);
    });
    it('should support multiple extensions in the same namespace', function() {
        // expect.assertions(2);
        evalScript(`
            class Foo extends HTMLElement {}
            class Bar extends Foo {}
            customElements.define('x-foo-bar', Bar);
            const elm = document.createElement('x-foo-bar');
            expect(elm instanceof Bar).toBe(true);
            expect(elm instanceof Foo).toBe(true);
        `);
    });
    it('should support multiple extensions from blue in the same namespace', function() {
        // expect.assertions(3);
        evalScript(`
            const Base = customElements.get('x-base');
            class Foo extends Base {}
            class Bar extends Foo {}
            customElements.define('x-base-foo-bar', Bar);
            const elm = document.createElement('x-base-foo-bar');
            expect(elm instanceof Bar).toBe(true);
            expect(elm instanceof Foo).toBe(true);
            expect(elm instanceof Base).toBe(true);
        `);
    });
});

describe('NS-to-NS custom element extension', () => {

    const evalScriptNS1 = createVirtualEnvironment({ endowments: window });
    const evalScriptNS2 = createVirtualEnvironment({ endowments: window });

    it('should work when using multiple namespaces in proto-chain', function() {
        // expect.assertions(6);
        evalScriptNS1(`
            const Base = customElements.get('x-base');
            class Foo extends Base {}
            customElements.define('x-ns1-foo', Foo);
        `);
        evalScriptNS2(`
            const Base = customElements.get('x-base');
            const Foo = customElements.get('x-ns1-foo');
            class Bar extends Foo {}
            customElements.define('x-ns2-bar', Bar);
            const elm = document.createElement('x-ns2-bar');
            expect(elm instanceof Bar).toBe(true);
            expect(elm instanceof Foo).toBe(true);
            expect(elm instanceof Base).toBe(true);
        `);
    });
});
