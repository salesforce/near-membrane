import { ObjectLookupOwnGetter } from '@locker/near-membrane-shared';

export const HTMLIFrameElementProtoContentWindowGetter = ObjectLookupOwnGetter(
    HTMLIFrameElement.prototype,
    'contentWindow'
)!;
