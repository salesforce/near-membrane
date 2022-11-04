import {
    DocumentProtoBodyGetter,
    DocumentProtoClose,
    DocumentProtoCreateElement,
    DocumentProtoOpen,
} from '../../dist/index.mjs.js';

describe('Document', () => {
    it('DocumentProtoClose', () => {
        expect(DocumentProtoClose).toBe(Document.prototype.close);
    });
    it('DocumentProtoBodyGetter', () => {
        expect(DocumentProtoBodyGetter).toBe(
            Reflect.getOwnPropertyDescriptor(Document.prototype, 'body').get
        );
    });
    it('DocumentProtoCreateElement', () => {
        expect(DocumentProtoCreateElement).toBe(Document.prototype.createElement);
    });
    it('DocumentProtoOpen', () => {
        expect(DocumentProtoOpen).toBe(Document.prototype.open);
    });
});
