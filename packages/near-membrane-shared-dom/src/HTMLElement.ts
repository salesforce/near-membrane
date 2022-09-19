import { ObjectLookupOwnGetter } from '@locker/near-membrane-shared';

export const HTMLElementProtoStyleGetter = ObjectLookupOwnGetter(HTMLElement.prototype, 'style')!;
