import createVirtualEnvironment from '@locker/near-membrane-dom';

customElements.define('x-base', class Base extends HTMLElement {});

const envOptions = {
    globalObjectShape: window,
};

describe('Extending Custom Element', () => {
    const env = createVirtualEnvironment(window, envOptions);

    it('should be allowed from blue to red', () => {
        expect.assertions(1);

        env.evaluate(`
            const Base = customElements.get('x-base');
            customElements.define('x-red-base', class extends Base {});
            const elm = document.createElement('x-red-base');
            expect(elm instanceof Base).toBe(true);
        `);
    });
    it('should be allowed in red', () => {
        expect.assertions(1);

        env.evaluate(`
            class Red extends HTMLElement {}
            customElements.define('x-red', Red);
            const elm = document.createElement('x-red');
            expect(elm instanceof Red).toBe(true);
        `);
    });
    it('should support multiple extensions in the same namespace', () => {
        expect.assertions(2);

        env.evaluate(`
            class Foo extends HTMLElement {}
            class Bar extends Foo {}
            customElements.define('x-foo-bar', Bar);
            const elm = document.createElement('x-foo-bar');
            expect(elm instanceof Bar).toBe(true);
            expect(elm instanceof Foo).toBe(true);
        `);
    });
    it('should support multiple extensions from blue in the same namespace', () => {
        expect.assertions(3);

        env.evaluate(`
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
    const envNS1 = createVirtualEnvironment(window, envOptions);
    const envNS2 = createVirtualEnvironment(window, envOptions);

    it('should work when using multiple namespaces in proto-chain', () => {
        expect.assertions(3);

        envNS1.evaluate(`
            const Base = customElements.get('x-base');
            class Foo extends Base {}
            customElements.define('x-ns1-foo', Foo);
        `);
        envNS2.evaluate(`
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
