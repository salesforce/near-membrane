import { ArrayBufferProtoByteLengthGetter } from '../../dist/index.mjs.js';

describe('ArrayBuffer', () => {
    it('ArrayBufferProtoByteLengthGetter', () => {
        expect(ArrayBufferProtoByteLengthGetter).toBe(
            Reflect.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get
        );
    });
});
