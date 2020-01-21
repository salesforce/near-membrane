import createSecureEnvironment from '../../lib/browser-realm.js';

const evalScript = createSecureEnvironment();

// outer element declaration
class ExternalElement extends HTMLElement {
    identity() {
        return 'ExternalElement';
    }
}
customElements.define('x-external', ExternalElement);

describe('Outer Realm Custom Element', () => {
    it('should be accessible within the sandbox', function() {
        // expect.assertions(3);
        evalScript(`
            const elm = document.createElement('x-external');
            expect(elm.identity()).toBe('ExternalElement');
        `);
        evalScript(`
            document.body.innerHTML = '<x-external></x-external>';
            const elm = document.body.firstChild;
            expect(elm.identity()).toBe('ExternalElement');
        `);
        evalScript(`
            const elm = new (customElements.get('x-external'))();
            expect(elm.identity()).toBe('ExternalElement');
        `);
    });
    it('should be extensible within the sandbox', function() {
        // expect.assertions(3);
        evalScript(`
            const ExtenalElement = customElements.get('x-external');
            class Foo extends ExtenalElement {}
            customElements.define('x-foo', Foo);
            const elm = document.createElement('x-foo');
            expect(elm.identity()).toBe('ExternalElement');
            expect(elm instanceof Foo).toBe(true);
            expect(elm instanceof ExtenalElement).toBe(true);
        `);
    });
});

describe('Sandboxed Custom Element', () => {
    evalScript(`
        class Bar extends HTMLElement {}
        customElements.define('x-bar', Bar);
    `);
    xit('should preserve the invariants of classes', function() {
        // expect.assertions(12);
        evalScript(`
            const Bar = customElements.get('x-bar');
            // checking class invariants from within the sandbox
            expect(HTMLElement.__proto__).toBe(Element);
            expect(HTMLElement.prototype.__proto__).toBe(Element.prototype);
            expect(HTMLElement.prototype.constructor).toBe(HTMLElement);
            expect(Bar.__proto__).toBe(HTMLElement);
            expect(Bar.prototype.__proto__).toBe(HTMLElement.prototype);
            expect(Bar.prototype.constructor).toBe(Bar);
        `);
        // checking class invariants from outer realm
        const SandboxedBar = customElements.get('x-bar');
        expect(HTMLElement.__proto__).toBe(Element);
        expect(HTMLElement.prototype.__proto__).toBe(Element.prototype);
        expect(HTMLElement.prototype.constructor).toBe(HTMLElement);
        expect(SandboxedBar.__proto__).toBe(HTMLElement);
        expect(SandboxedBar.prototype.__proto__).toBe(HTMLElement.prototype);
        expect(SandboxedBar.prototype.constructor).toBe(SandboxedBar);
    });
});
