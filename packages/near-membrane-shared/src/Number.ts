export const NumberCtor = Number;

export const {
    isFinite: NumberIsFinite,
    isInteger: NumberIsInteger,
    isNaN: NumberIsNaN,
} = NumberCtor;

export const { valueOf: NumberProtoValueOf } = NumberCtor.prototype;
