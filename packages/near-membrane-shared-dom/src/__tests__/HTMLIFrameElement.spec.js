import { HTMLIFrameElementProtoContentWindowGetter } from '../../dist/index';

describe('HTMLIFrameElement', () => {
    it('HTMLIFrameElementProtoContentWindowGetter', () => {
        expect(HTMLIFrameElementProtoContentWindowGetter).toBe(
            Reflect.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow').get
        );
    });
});
