import { ObjectLookupOwnGetter } from '@locker/near-membrane-shared';

const { prototype: NodeProto } = Node;

export const { appendChild: NodeProtoAppendChild } = NodeProto;

export const NodeProtoLastChildGetter = ObjectLookupOwnGetter(NodeProto, 'lastChild')!;
