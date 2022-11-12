import { ObjectLookupOwnGetter } from '@locker/near-membrane-shared';

// The DOMException constructor was exposed in Edge 12 but wasn't invocable
// until Edge 79. As long as this is used for instanceof checks it should be fine.
// https://developer.mozilla.org/en-US/docs/Web/API/DOMException#browser_compatibility
export const DOMExceptionCtor = DOMException;

export const { DATA_CLONE_ERR: DATA_CLONE_ERROR_CODE } = DOMExceptionCtor;

export const DOMExceptionProtoCodeGetter = ObjectLookupOwnGetter(
    DOMExceptionCtor.prototype,
    'code'
)!;
