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
export const TO_STRING_BRAND_BIG_INT = '[object BigInt]';
export const TO_STRING_BRAND_BOOLEAN = '[object Boolean]';
export const TO_STRING_BRAND_NUMBER = '[object Number]';
export const TO_STRING_BRAND_STRING = '[object String]';
export const TO_STRING_BRAND_SYMBOL = '[object Symbol]';
