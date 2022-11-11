import { ObjectLookupOwnGetter } from './Object';

export const ArrayBufferProtoByteLengthGetter = ObjectLookupOwnGetter(
    ArrayBuffer.prototype,
    'byteLength'
)!;
