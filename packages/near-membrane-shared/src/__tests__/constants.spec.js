import {
    CHAR_ELLIPSIS,
    ERR_ILLEGAL_PROPERTY_ACCESS,
    LOCKER_IDENTIFIER_MARKER,
    LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL,
    LOCKER_NEAR_MEMBRANE_SYMBOL,
    LOCKER_UNMINIFIED_FLAG,
    SYMBOL_LIVE_OBJECT,
    TO_STRING_BRAND_ARRAY,
    TO_STRING_BRAND_ARRAY_BUFFER,
    TO_STRING_BRAND_BIG_INT,
    TO_STRING_BRAND_BOOLEAN,
    TO_STRING_BRAND_DATE,
    TO_STRING_BRAND_FUNCTION,
    TO_STRING_BRAND_MAP,
    TO_STRING_BRAND_NULL,
    TO_STRING_BRAND_NUMBER,
    TO_STRING_BRAND_OBJECT,
    TO_STRING_BRAND_REG_EXP,
    TO_STRING_BRAND_SET,
    TO_STRING_BRAND_STRING,
    TO_STRING_BRAND_SYMBOL,
    TO_STRING_BRAND_UNDEFINED,
    TO_STRING_BRAND_WEAK_MAP,
    TO_STRING_BRAND_WEAK_SET,
} from '../../dist/index.mjs.js';

describe('constants', () => {
    it('LOCKER_IDENTIFIER_MARKER', () => {
        expect(LOCKER_IDENTIFIER_MARKER).toBe('$LWS');
    });
    it('LOCKER_UNMINIFIED_FLAG is a boolean', () => {
        expect(typeof LOCKER_UNMINIFIED_FLAG).toBe('boolean');
    });
    it('CHAR_ELLIPSIS', () => {
        expect(CHAR_ELLIPSIS).toBe('\u2026');
    });
    it('ERR_ILLEGAL_PROPERTY_ACCESS', () => {
        expect(ERR_ILLEGAL_PROPERTY_ACCESS).toBe('Illegal property access.');
    });
    it('LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL is a symbol', () => {
        expect(typeof LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL).toBe('symbol');
    });
    it('LOCKER_NEAR_MEMBRANE_SYMBOL is a symbol', () => {
        expect(typeof LOCKER_NEAR_MEMBRANE_SYMBOL).toBe('symbol');
    });
    it('LOCKER_NEAR_MEMBRANE symbols are distinct', () => {
        expect(LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL).not.toBe(LOCKER_NEAR_MEMBRANE_SYMBOL);
    });
    it('SYMBOL_LIVE_OBJECT is a symbol', () => {
        expect(typeof SYMBOL_LIVE_OBJECT).toBe('symbol');
    });
    it('SYMBOL_LIVE_OBJECT is distinct from near-membrane symbols', () => {
        expect(SYMBOL_LIVE_OBJECT).not.toBe(LOCKER_NEAR_MEMBRANE_SYMBOL);
        expect(SYMBOL_LIVE_OBJECT).not.toBe(LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL);
    });
    it('TO_STRING_BRAND constants match [object X] format', () => {
        const brands = [
            TO_STRING_BRAND_ARRAY,
            TO_STRING_BRAND_ARRAY_BUFFER,
            TO_STRING_BRAND_BIG_INT,
            TO_STRING_BRAND_BOOLEAN,
            TO_STRING_BRAND_DATE,
            TO_STRING_BRAND_FUNCTION,
            TO_STRING_BRAND_MAP,
            TO_STRING_BRAND_NULL,
            TO_STRING_BRAND_NUMBER,
            TO_STRING_BRAND_OBJECT,
            TO_STRING_BRAND_REG_EXP,
            TO_STRING_BRAND_SET,
            TO_STRING_BRAND_STRING,
            TO_STRING_BRAND_SYMBOL,
            TO_STRING_BRAND_UNDEFINED,
            TO_STRING_BRAND_WEAK_MAP,
            TO_STRING_BRAND_WEAK_SET,
        ];
        for (const brand of brands) {
            expect(brand).toMatch(/^\[object \w+\]$/);
        }
    });
    it('TO_STRING_BRAND constants match their expected values', () => {
        expect(TO_STRING_BRAND_ARRAY).toBe('[object Array]');
        expect(TO_STRING_BRAND_ARRAY_BUFFER).toBe('[object ArrayBuffer]');
        expect(TO_STRING_BRAND_BIG_INT).toBe('[object BigInt]');
        expect(TO_STRING_BRAND_BOOLEAN).toBe('[object Boolean]');
        expect(TO_STRING_BRAND_DATE).toBe('[object Date]');
        expect(TO_STRING_BRAND_FUNCTION).toBe('[object Function]');
        expect(TO_STRING_BRAND_MAP).toBe('[object Map]');
        expect(TO_STRING_BRAND_NULL).toBe('[object Null]');
        expect(TO_STRING_BRAND_NUMBER).toBe('[object Number]');
        expect(TO_STRING_BRAND_OBJECT).toBe('[object Object]');
        expect(TO_STRING_BRAND_REG_EXP).toBe('[object RegExp]');
        expect(TO_STRING_BRAND_SET).toBe('[object Set]');
        expect(TO_STRING_BRAND_STRING).toBe('[object String]');
        expect(TO_STRING_BRAND_SYMBOL).toBe('[object Symbol]');
        expect(TO_STRING_BRAND_UNDEFINED).toBe('[object Undefined]');
        expect(TO_STRING_BRAND_WEAK_MAP).toBe('[object WeakMap]');
        expect(TO_STRING_BRAND_WEAK_SET).toBe('[object WeakSet]');
    });
});
