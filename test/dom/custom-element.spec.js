/* eslint-disable no-proto */
import createVirtualEnvironment from '@locker/near-membrane-dom';

class ExternalElement extends HTMLElement {
    // eslint-disable-next-line class-methods-use-this
    identity() {
        return 'ExternalElement';
    }
}

customElements.define('x-external', ExternalElement);

describe('Outer Realm Custom Element', () => {
    const envOptions = {
        globalObjectShape: window,
    };

    it('should be accessible within the sandbox', () => {
        expect.assertions(3);

        const env = createVirtualEnvironment(window, envOptions);

        env.evaluate(`
            const elm = document.createElement('x-external');
            expect(elm.identity()).toBe('ExternalElement');
        `);
        env.evaluate(`
            document.body.innerHTML = '<x-external></x-external>';
            const elm = document.body.firstChild;
            expect(elm.identity()).toBe('ExternalElement');
        `);
        env.evaluate(`
            const elm = new (customElements.get('x-external'))();
            expect(elm.identity()).toBe('ExternalElement');
        `);
    });
    it('should be extensible within the sandbox', () => {
        expect.assertions(3);

        const env = createVirtualEnvironment(window, envOptions);

        env.evaluate(`
            const ExternalElement = customElements.get('x-external');
            class Foo extends ExternalElement {}
            customElements.define('x-foo', Foo);
            const elm = document.createElement('x-foo');
            expect(elm.identity()).toBe('ExternalElement');
            expect(elm instanceof Foo).toBe(true);
            expect(elm instanceof ExternalElement).toBe(true);
        `);
    });
    it('should be extensible and can be new from within the sandbox', () => {
        expect.assertions(3);

        const env = createVirtualEnvironment(window, envOptions);

        env.evaluate(`
            const ExternalElement = customElements.get('x-external');
            class Baz extends ExternalElement {}
            customElements.define('x-baz', Baz);
            const elm = new Baz();
            expect(elm.identity()).toBe('ExternalElement');
            expect(elm instanceof Baz).toBe(true);
            expect(elm instanceof ExternalElement).toBe(true);
        `);
    });
    it('should get access to external registered elements', () => {
        expect.assertions(1);

        window.refToExternalElement = ExternalElement;

        const env = createVirtualEnvironment(window, {
            // Provides refToExternalElement & expect
            globalObjectShape: window,
        });

        env.evaluate(`
            const E = customElements.get('x-external');
            expect(E).toBe(refToExternalElement);
        `);
    });
    it('should preserve the invariants of classes in outer realm', () => {
        expect.assertions(7);

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
    it('should preserve the invariants of classes from within the sandbox', () => {
        window.refToExternalElement = ExternalElement;

        const env = createVirtualEnvironment(window, {
            globalObjectShape: window,
        });

        env.evaluate(`
            class Bar extends HTMLElement {}
            customElements.define('x-bar', Bar);
        `);
        env.evaluate(`
            expect(HTMLElement.__proto__ === Element).toBeTrue();
            expect(HTMLElement.prototype.__proto__ === Element.prototype).toBeTrue();
            expect(HTMLElement.prototype.constructor === HTMLElement).toBeTrue();
            expect(refToExternalElement.__proto__ === HTMLElement).toBeTrue();
            expect(refToExternalElement.prototype.__proto__ === HTMLElement.prototype).toBeTrue();
            expect(refToExternalElement.prototype.constructor === refToExternalElement).toBeTrue();
        `);
    });
});
