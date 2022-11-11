export const LOCKER_IDENTIFIER_MARKER = '$LWS';
// This package is bundled by third-parties that have their own build time
// replacement logic. Instead of customizing each build system to be aware
// of this package we implement a two phase debug mode by performing small
// runtime checks to determine phase one, our code is unminified, and
// phase two, the user opted-in to custom devtools formatters. Phase one
// is used for light weight initialization time debug while phase two is
// reserved for post initialization runtime.

// istanbul ignore next
export const LOCKER_UNMINIFIED_FLAG = `${() => /* $LWS */ 1}`.includes(LOCKER_IDENTIFIER_MARKER);
export const CHAR_ELLIPSIS = '\u2026';
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
