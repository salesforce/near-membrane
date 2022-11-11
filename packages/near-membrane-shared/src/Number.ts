const NumberCtor = Number;

export const { isFinite: NumberIsFinite, isInteger: NumberIsInteger } = NumberCtor;

export const { valueOf: NumberProtoValueOf } = NumberCtor.prototype;
