import { ElementProtoRemove, ElementProtoSetAttribute } from '../../dist/index';

describe('Element', () => {
    it('ElementProtoRemove', () => {
        expect(ElementProtoRemove).toBe(Element.prototype.remove);
    });
    it('ElementProtoSetAttribute', () => {
        expect(ElementProtoSetAttribute).toBe(Element.prototype.setAttribute);
    });
});
