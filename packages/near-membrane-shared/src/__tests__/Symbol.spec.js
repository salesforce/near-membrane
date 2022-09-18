import { SymbolIterator, SymbolToStringTag, SymbolUnscopables } from '../../dist/index';

describe('Symbol', () => {
    it('SymbolIterator', () => {
        expect(SymbolIterator).toBe(Symbol.iterator);
    });
    it('SymbolToStringTag', () => {
        expect(SymbolToStringTag).toBe(Symbol.toStringTag);
    });
    it('SymbolUnscopables', () => {
        expect(SymbolUnscopables).toBe(Symbol.unscopables);
    });
});
