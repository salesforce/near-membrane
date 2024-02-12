import { ObjectLookupOwnGetter } from './Object';

export const SetCtor = Set;

const { prototype: SetProto } = SetCtor;

export const { add: SetProtoAdd, has: SetProtoHas, values: SetProtoValues } = SetProto;

export const SetProtoSizeGetter = ObjectLookupOwnGetter(SetProto, 'size')!;
