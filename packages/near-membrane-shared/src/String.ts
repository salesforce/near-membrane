export const StringCtor = String;

const { prototype: StringProto } = StringCtor;

export const { slice: StringProtoSlice, valueOf: StringProtoValueOf } = StringProto;
