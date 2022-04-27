import { createRedConnector } from '@locker/near-membrane-base';

describe('createRedConnector()', () => {
    it('throws when evaluator is missing', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);

        // @ts-ignore
        expect(() => createRedConnector()).toThrow();
    });
    it('returns connector function when evaluator is present', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);
        const connector = createRedConnector(window.eval);
        expect(typeof connector).toBe('function');
    });
    it('returns connector function for iframe.contentWindow', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);
        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts');
        document.body.appendChild(iframe);
        const connector = createRedConnector(iframe.contentWindow.eval);
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
        const connector = createRedConnector(iframe.contentWindow.window.eval);
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
        const connector = createRedConnector(iframe.contentWindow.globalThis.eval);
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
        const connector = createRedConnector(otherEval);
        iframe.remove();
        expect(typeof connector).toBe('function');
    });
});
