import { HTMLElementProtoStyleGetter } from '../../dist/index';

describe('HTMLElement', () => {
    it('HTMLElementProtoStyleGetter', () => {
        expect(HTMLElementProtoStyleGetter).toBe(
            Reflect.getOwnPropertyDescriptor(HTMLElement.prototype, 'style').get
        );
    });
});
