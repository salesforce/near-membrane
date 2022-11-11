import { ObjectLookupOwnGetter } from './Object';

export const RegExpCtor = RegExp;

const { prototype: RegExpProto } = RegExpCtor;

export const { test: RegExpProtoTest } = RegExpProto;

export const RegExpProtoSourceGetter = ObjectLookupOwnGetter(RegExpProto, 'source')!;
