const SymbolCtor = Symbol;

export const {
    for: SymbolFor,
    iterator: SymbolIterator,
    toStringTag: SymbolToStringTag,
    unscopables: SymbolUnscopables,
} = SymbolCtor;

export const { valueOf: SymbolProtoValueOf } = SymbolCtor.prototype;
