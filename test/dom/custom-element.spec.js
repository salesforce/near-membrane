/* eslint-disable no-proto */
// eslint-disable-next-line import/no-unresolved
import createVirtualEnvironment from '@locker/near-membrane-dom';

// outer element declaration
class ExternalElement extends HTMLElement {
    // eslint-disable-next-line class-methods-use-this
    identity() {
        return 'ExternalElement';
    }
}
customElements.define('x-external', ExternalElement);
window.refToExternalElement = ExternalElement;

const evalScript = createVirtualEnvironment({ endowments: window });

describe('Outer Realm Custom Element', () => {
    it('should be accessible within the sandbox', () => {
        expect.assertions(3);
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
    it('should be extensible within the sandbox', () => {
        expect.assertions(3);
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
    it('should be extensible and can be new from within the sandbox', () => {
        expect.assertions(3);
        evalScript(`
            const ExtenalElement = customElements.get('x-external');
            class Baz extends ExtenalElement {}
            customElements.define('x-baz', Baz);
            const elm = new Baz();
            expect(elm.identity()).toBe('ExternalElement');
            expect(elm instanceof Baz).toBe(true);
            expect(elm instanceof ExtenalElement).toBe(true);
        `);
    });
    it('should get access to external registered elements', () => {
        expect.assertions(1);
        evalScript(`
            const E = customElements.get('x-external');
            expect(E).toBe(refToExternalElement);
        `);
    });
    it('should preserve the invariants of classes in outer realm', () => {
        expect.assertions(7);
        // eslint-disable-next-line no-proto
        expect(HTMLElement.__proto__ === Element).toBeTrue();
        expect(HTMLElement.prototype.__proto__ === Element.prototype).toBeTrue();
        expect(HTMLElement.prototype.constructor === HTMLElement).toBeTrue();
        expect(ExternalElement.__proto__ === HTMLElement).toBeTrue();
        expect(ExternalElement.prototype.__proto__ === HTMLElement.prototype).toBeTrue();
        expect(ExternalElement.prototype.constructor === ExternalElement).toBeTrue();
        expect(customElements.get('x-external') === ExternalElement).toBeTrue();
    });
});

describe('Sandboxed Custom Element', () => {
    evalScript(`
        class Bar extends HTMLElement {}
        customElements.define('x-bar', Bar);
    `);
    it('should preserve the invariants of classes from within the sandbox', () => {
        evalScript(`
            expect(HTMLElement.__proto__ === Element).toBeTrue();
            expect(HTMLElement.prototype.__proto__ === Element.prototype).toBeTrue();
            expect(HTMLElement.prototype.constructor === HTMLElement).toBeTrue();
            expect(refToExternalElement.__proto__ === HTMLElement).toBeTrue();
            expect(refToExternalElement.prototype.__proto__ === HTMLElement.prototype).toBeTrue();
            expect(refToExternalElement.prototype.constructor === refToExternalElement).toBeTrue();
        `);
    });
});
