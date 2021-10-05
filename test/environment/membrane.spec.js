import { createConnectorForGlobalObject } from '@locker/near-membrane-dom';

describe('createConnectorForGlobalObject()', () => {
    it('throws when globalObject is missing', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);

        // @ts-ignore
        expect(() => createConnectorForGlobalObject()).toThrow();
    });
    it('throws when globalObject.eval is missing', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);

        // @ts-ignore
        expect(() => createConnectorForGlobalObject({})).toThrow();
    });
    it('returns connector function window', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);
        const connector = createConnectorForGlobalObject(window);
        expect(typeof connector).toBe('function');
    });
    it('returns connector function for iframe.contentWindow', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);
        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts');
        document.body.appendChild(iframe);
        const connector = createConnectorForGlobalObject(iframe.contentWindow);
        iframe.remove();
        expect(typeof connector).toBe('function');
    });
    it('returns connector function for iframe.contentWindow.window', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);
        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts');
        document.body.appendChild(iframe);
        const connector = createConnectorForGlobalObject(iframe.contentWindow.window);
        iframe.remove();
        expect(typeof connector).toBe('function');
    });
    it('returns connector function for iframe.contentWindow.globalThis', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);
        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts');
        document.body.appendChild(iframe);
        const connector = createConnectorForGlobalObject(iframe.contentWindow.globalThis);
        iframe.remove();
        expect(typeof connector).toBe('function');
    });
    it('returns connector function for indirect ref eval', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);
        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts');
        document.body.appendChild(iframe);
        const { eval: otherEval } = iframe.contentWindow;
        const connector = createConnectorForGlobalObject({ eval: otherEval });
        iframe.remove();
        expect(typeof connector).toBe('function');
    });
});
