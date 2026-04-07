const SymbolCtor = Symbol;

export const {
    asyncIterator: SymbolAsyncIterator,
    for: SymbolFor,
    iterator: SymbolIterator,
    toStringTag: SymbolToStringTag,
    unscopables: SymbolUnscopables,
} = SymbolCtor;

export const { toString: SymbolProtoToString, valueOf: SymbolProtoValueOf } = SymbolCtor.prototype;
