import { ObjectLookupOwnGetter } from '@locker/near-membrane-shared';

export const topDocument = document;

const { prototype: DocumentProto } = Document;

export const {
    close: DocumentProtoClose,
    createElement: DocumentProtoCreateElement,
    open: DocumentProtoOpen,
} = DocumentProto;

export const DocumentProtoBodyGetter = ObjectLookupOwnGetter(DocumentProto, 'body')!;
