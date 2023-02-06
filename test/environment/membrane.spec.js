import { createRedConnector } from '@locker/near-membrane-base';

describe('createRedConnector()', () => {
    it('throws when evaluator is missing', () => {
        expect(() => createRedConnector()).toThrow();
    });
    it('returns connector function when evaluator is present', () => {
        const connector = createRedConnector(window.eval);
        expect(typeof connector).toBe('function');
    });
    it('returns connector function for iframe.contentWindow', () => {
        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts');
        document.body.appendChild(iframe);
        const connector = createRedConnector(iframe.contentWindow.eval);
        iframe.remove();
        expect(typeof connector).toBe('function');
    });
    it('returns connector function for iframe.contentWindow.window', () => {
        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts');
        document.body.appendChild(iframe);
        const connector = createRedConnector(iframe.contentWindow.window.eval);
        iframe.remove();
        expect(typeof connector).toBe('function');
    });
    it('returns connector function for iframe.contentWindow.globalThis', () => {
        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts');
        document.body.appendChild(iframe);
        const connector = createRedConnector(iframe.contentWindow.globalThis.eval);
        iframe.remove();
        expect(typeof connector).toBe('function');
    });
    it('returns connector function for indirect ref eval', () => {
        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts');
        document.body.appendChild(iframe);
        const { eval: otherEval } = iframe.contentWindow;
        const connector = createRedConnector(otherEval);
        iframe.remove();
        expect(typeof connector).toBe('function');
    });
});
