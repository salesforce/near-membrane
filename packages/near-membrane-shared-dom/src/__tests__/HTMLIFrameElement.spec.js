import { HTMLIFrameElementProtoContentWindowGetter } from '../../dist/index.mjs.js';

describe('HTMLIFrameElement', () => {
    it('HTMLIFrameElementProtoContentWindowGetter', () => {
        expect(HTMLIFrameElementProtoContentWindowGetter).toBe(
            Reflect.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow').get
        );
    });
});
