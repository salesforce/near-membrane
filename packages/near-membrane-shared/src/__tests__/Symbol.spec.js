import {
    SymbolAsyncIterator,
    SymbolFor,
    SymbolIterator,
    SymbolProtoToString,
    SymbolProtoValueOf,
    SymbolToStringTag,
    SymbolUnscopables,
} from '../../dist/index.mjs.js';

describe('Symbol', () => {
    it('SymbolAsyncIterator', () => {
        expect(SymbolAsyncIterator).toBe(Symbol.asyncIterator);
    });
    it('SymbolFor', () => {
        expect(SymbolFor).toBe(Symbol.for);
    });
    it('SymbolIterator', () => {
        expect(SymbolIterator).toBe(Symbol.iterator);
    });
    it('SymbolProtoToString', () => {
        expect(SymbolProtoToString).toBe(Symbol.prototype.toString);
    });
    it('SymbolProtoValueOf', () => {
        expect(SymbolProtoValueOf).toBe(Symbol.prototype.valueOf);
    });
    it('SymbolToStringTag', () => {
        expect(SymbolToStringTag).toBe(Symbol.toStringTag);
    });
    it('SymbolUnscopables', () => {
        expect(SymbolUnscopables).toBe(Symbol.unscopables);
    });
});
