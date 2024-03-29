import { SymbolFor } from './Symbol';

// Locker build constants.
export const LOCKER_IDENTIFIER_MARKER = '$LWS';
// This package is bundled by third-parties that have their own build time
// replacement logic. Instead of customizing each build system to be aware
// of this package we implement a two phase debug mode by performing small
// runtime checks to determine phase one, our code is unminified, and
// phase two, the user opted-in to custom devtools formatters. Phase one
// is used for light weight initialization time debug while phase two is
// reserved for post initialization runtime
export const LOCKER_UNMINIFIED_FLAG =
    // eslint-disable-next-line @typescript-eslint/naming-convention
    /* istanbul ignore next */ `${(function LOCKER_UNMINIFIED_FLAG() {
        return LOCKER_UNMINIFIED_FLAG.name;
    })()}`.includes('LOCKER_UNMINIFIED_FLAG');

// Character constants.
export const CHAR_ELLIPSIS = '\u2026';

// Error message constants.
export const ERR_ILLEGAL_PROPERTY_ACCESS = 'Illegal property access.';

// Near-membrane constants.
export const LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL = SymbolFor(
    '@@lockerNearMembraneSerializedValue'
);
export const LOCKER_NEAR_MEMBRANE_SYMBOL = SymbolFor('@@lockerNearMembrane');
export const SYMBOL_LIVE_OBJECT = SymbolFor('@@lockerLiveValue');

// Object brand constants.
export const TO_STRING_BRAND_ARRAY = '[object Array]';
export const TO_STRING_BRAND_ARRAY_BUFFER = '[object ArrayBuffer]';
export const TO_STRING_BRAND_BIG_INT = '[object BigInt]';
export const TO_STRING_BRAND_BOOLEAN = '[object Boolean]';
export const TO_STRING_BRAND_DATE = '[object Date]';
export const TO_STRING_BRAND_FUNCTION = '[object Function]';
export const TO_STRING_BRAND_MAP = '[object Map]';
export const TO_STRING_BRAND_NULL = '[object Null]';
export const TO_STRING_BRAND_NUMBER = '[object Number]';
export const TO_STRING_BRAND_OBJECT = '[object Object]';
export const TO_STRING_BRAND_REG_EXP = '[object RegExp]';
export const TO_STRING_BRAND_SET = '[object Set]';
export const TO_STRING_BRAND_STRING = '[object String]';
export const TO_STRING_BRAND_SYMBOL = '[object Symbol]';
export const TO_STRING_BRAND_UNDEFINED = '[object Undefined]';
export const TO_STRING_BRAND_WEAK_MAP = '[object WeakMap]';
export const TO_STRING_BRAND_WEAK_SET = '[object WeakSet]';
