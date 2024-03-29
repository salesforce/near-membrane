import { HTMLElementProtoStyleGetter } from '../../dist/index.mjs.js';

describe('HTMLElement', () => {
    it('HTMLElementProtoStyleGetter', () => {
        expect(HTMLElementProtoStyleGetter).toBe(
            Reflect.getOwnPropertyDescriptor(HTMLElement.prototype, 'style').get
        );
    });
});
