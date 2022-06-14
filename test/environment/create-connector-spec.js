import { createBlueConnector } from '@locker/near-membrane-base';

/*
    These tests are exercising the BUILT near-membrane-base,
    ie. package/near-membrane-base/dist/index.js
*/
describe('createBlueConnector', () => {
    it('creates a different connector for the same window object with a different location', async () => {
        expect.assertions(1);
        const iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        const connector1 = createBlueConnector(iframe.contentWindow);
        let resolver;
        const promise = new Promise((resolve) => {
            resolver = resolve;
        });
        iframe.addEventListener('load', () => {
            const connector2 = createBlueConnector(iframe.contentWindow);
            expect(connector1).not.toBe(connector2);
            iframe.remove();
            resolver();
        });
        iframe.src = 'about:blank';
        await promise;
    });
});
