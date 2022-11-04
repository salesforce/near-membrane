import { ElementProtoRemove, ElementProtoSetAttribute } from '../../dist/index.mjs.js';

describe('Element', () => {
    it('ElementProtoRemove', () => {
        expect(ElementProtoRemove).toBe(Element.prototype.remove);
    });
    it('ElementProtoSetAttribute', () => {
        expect(ElementProtoSetAttribute).toBe(Element.prototype.setAttribute);
    });
});
