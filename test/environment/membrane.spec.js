import { createConnector } from '@locker/near-membrane-dom';

describe('createConnector()', () => {
    it('throws when evaluator is missing', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);

        // @ts-ignore
        expect(() => createConnector()).toThrow();
    });
    it('returns connector function when evaluator is present', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);
        const connector = createConnector(window.eval);
        expect(typeof connector).toBe('function');
    });
    it('returns connector function for iframe.contentWindow', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);
        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts');
        document.body.appendChild(iframe);
        const connector = createConnector(iframe.contentWindow.eval);
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
        const connector = createConnector(iframe.contentWindow.window.eval);
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
        const connector = createConnector(iframe.contentWindow.globalThis.eval);
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
        const connector = createConnector(otherEval);
        iframe.remove();
        expect(typeof connector).toBe('function');
    });
});
