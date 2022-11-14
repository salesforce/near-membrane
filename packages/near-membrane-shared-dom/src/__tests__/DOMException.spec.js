import {
    DATA_CLONE_ERROR_CODE,
    DOMExceptionCtor,
    DOMExceptionProtoCodeGetter,
} from '../../dist/index.mjs.js';

describe('DOMException', () => {
    it('DATA_CLONE_ERROR_CODE', () => {
        expect(DATA_CLONE_ERROR_CODE).toBe(DOMException.DATA_CLONE_ERR);
    });
    it('DOMExceptionCtor', () => {
        expect(DOMExceptionCtor).toBe(DOMException);
    });
    it('DOMExceptionProtoCodeGetter', () => {
        expect(DOMExceptionProtoCodeGetter).toBe(
            Reflect.getOwnPropertyDescriptor(DOMException.prototype, 'code').get
        );
    });
});
