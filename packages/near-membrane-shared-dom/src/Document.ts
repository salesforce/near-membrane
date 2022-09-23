import { ObjectLookupOwnGetter } from '@locker/near-membrane-shared';

const { prototype: DocumentProto } = Document;

export const {
    close: DocumentProtoClose,
    createElement: DocumentProtoCreateElement,
    open: DocumentProtoOpen,
} = DocumentProto;

export const DocumentProtoBodyGetter = ObjectLookupOwnGetter(DocumentProto, 'body')!;
