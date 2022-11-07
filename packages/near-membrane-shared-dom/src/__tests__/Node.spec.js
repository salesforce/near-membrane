import { NodeProtoAppendChild, NodeProtoLastChildGetter } from '../../dist/index.mjs.js';

describe('Node', () => {
    it('NodeAppendChild', () => {
        expect(NodeProtoAppendChild).toBe(Node.prototype.appendChild);
    });
    it('NodeProtoLastChildGetter', () => {
        expect(NodeProtoLastChildGetter).toBe(
            Reflect.getOwnPropertyDescriptor(Node.prototype, 'lastChild').get
        );
    });
});
