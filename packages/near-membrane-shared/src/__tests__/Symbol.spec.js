import {
    SymbolFor,
    SymbolIterator,
    SymbolProtoValueOf,
    SymbolToStringTag,
    SymbolUnscopables,
} from '../../dist/index.mjs.js';

describe('Symbol', () => {
    it('SymbolFor', () => {
        expect(SymbolFor).toBe(Symbol.for);
    });
    it('SymbolIterator', () => {
        expect(SymbolIterator).toBe(Symbol.iterator);
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
