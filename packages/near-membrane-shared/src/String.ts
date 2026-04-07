// @ts-nocheck
import { CHAR_QUOTE_DOUBLE, CHAR_QUOTE_SINGLE, TO_STRING_BRAND_SYMBOL } from './constants';
import { FunctionProtoToString } from './Function';
import { ObjectProtoToString } from './Object';
import { ReflectApply } from './Reflect';
import { SymbolProtoToString } from './Symbol';

export const StringCtor = String;

const { prototype: StringProto } = StringCtor;

export const {
    charAt: StringProtoCharAt,
    charCodeAt: StringProtoCharCodeAt,
    endsWith: StringProtoEndsWith,
    includes: StringProtoIncludes,
    indexOf: StringProtoIndexOf,
    lastIndexOf: StringProtoLastIndexOf,
    match: StringProtoMatch,
    normalize: StringProtoNormalize,
    replace: StringProtoReplace,
    slice: StringProtoSlice,
    split: StringProtoSplit,
    startsWith: StringProtoStartsWith,
    substring: StringProtoSubstring,
    toLowerCase: StringProtoToLowerCase,
    toUpperCase: StringProtoToUpperCase,
    valueOf: StringProtoValueOf,
} = StringProto;

const quoteCharRegExpRegistry = {
    __proto__: null,
    [CHAR_QUOTE_DOUBLE]: /\\?"/g,
    [CHAR_QUOTE_SINGLE]: /\\?'/g,
} as unknown as Record<string, RegExp>;

const TrustedHTMLCtor =
    typeof TrustedHTML === 'function'
        ? TrustedHTML
        : /* istanbul ignore next: unreachable in test env */ undefined;
// istanbul ignore next: optional chaining and nullish coalescing results in an expansion that contains an unreachable "void 0" branch for every occurrence of the operator
const TrustedHTMLProtoToString = TrustedHTMLCtor?.prototype?.toString;

const TrustedScriptCtor =
    typeof TrustedScript === 'function'
        ? TrustedScript
        : /* istanbul ignore next: unreachable in test env */ undefined;
// istanbul ignore next: optional chaining and nullish coalescing results in an expansion that contains an unreachable "void 0" branch for every occurrence of the operator
const TrustedScriptProtoToString = TrustedScriptCtor?.prototype?.toString;

const URLCtor =
    typeof URL === 'function' ? URL : /* istanbul ignore next: unreachable in test env */ undefined;
// istanbul ignore next: optional chaining and nullish coalescing results in an expansion that contains an unreachable "void 0" branch for every occurrence of the operator
const URLProtoToString = URLCtor?.prototype?.toString;

// To extract the function body start the match from the beginning of the
// source code with the character class `[\s\S]` instead of `.` because `[\s\S]`
// matches everything including newlines where as `.` matches everything except
// newlines. Next, continue matching past the opening left curly bracket of the
// function and beyond optional whitespace and newline. Finally, capture the
// function body up to, but not including, optional newline and whitespace by
// the closing right curly bracket at the end of the source code. The alternate
// pattern matches arrow functions without brackets.
const funcBodyRegExp =
    /^[\s\S]+?\{[\t ]*(?:\r?\n)?([\s\S]*?)(?:\r?\n)?[\t ]*\}$|[\s\S]+?=>\s*([\s\S]+?)\s*$/;

export function capitalizeFirstChar(string: string): string {
    const { length } = string;
    if (length) {
        const upper = ReflectApply(StringProtoToUpperCase, string[0], []);
        return length === 1 ? upper : upper + ReflectApply(StringProtoSlice, string, [1]);
    }
    return '';
}

export function enquote(string: string, quoteChar = CHAR_QUOTE_SINGLE) {
    return (
        quoteChar +
        ReflectApply(StringProtoReplace, string, [
            (quoteCharRegExpRegistry as any)[quoteChar] as RegExp,
            `\\${quoteChar}`,
        ]) +
        quoteChar
    );
}

export function extractFunctionBodySource(func: Function): string {
    const source = ReflectApply(FunctionProtoToString, func, []);
    const match = ReflectApply(StringProtoMatch, source, [funcBodyRegExp]);
    // istanbul ignore next: optional chaining and nullish coalescing results in an expansion that contains an unreachable "void 0" branch for every occurrence of the operator
    return match?.[1] ?? match?.[2] ?? '';
}

// Use `toSafeStringValue()` to coerce values using the default string concatenation
// operation. This must be done ONLY once on incoming values to avoid creating
// shape-shifting exploits, ie. passing { toString() {...} } where a string
// is otherwise expected.
export function toSafeStringValue(value: any): string {
    return typeof value === 'string'
        ? value
        : // Attempt to coerce `value` to a string with the ToString operation.
          // Section 7.1.17 ToString ( argument )
          // https://tc39.es/ecma262/#sec-tostring
          `${value}`;
}

// Use `toSafeTemplateStringValue()` for values embedded in template strings,
// like error messages, because it coerces more values, including symbols,
// to strings without throwing exceptions.
export function toSafeTemplateStringValue(value: any): string {
    if (typeof value === 'string') {
        return value;
    }
    try {
        if (typeof value === 'function') {
            return ReflectApply(FunctionProtoToString, value, []);
        }
        if (typeof value === 'object' && value !== null) {
            /* istanbul ignore next: unreachable in test env */
            if (TrustedHTMLCtor && value instanceof TrustedHTMLCtor) {
                return ReflectApply(TrustedHTMLProtoToString!, value, []);
            }
            /* istanbul ignore next: unreachable in test env */
            if (TrustedScriptCtor && value instanceof TrustedScriptCtor) {
                return ReflectApply(TrustedScriptProtoToString!, value, []);
            }
            if (URLCtor && value instanceof URLCtor) {
                return ReflectApply(URLProtoToString!, value, []);
            }
            const result = ReflectApply(ObjectProtoToString, value, []);
            return result === TO_STRING_BRAND_SYMBOL
                ? ReflectApply(SymbolProtoToString, value, [])
                : result;
        }
        if (typeof value === 'symbol') {
            return ReflectApply(SymbolProtoToString, value, []);
        }
        // Attempt to coerce `value` to a string with the String() constructor.
        // Section 22.1.1.1 String ( value )
        // https://tc39.es/ecma262/#sec-string-constructor-string-value
        return StringCtor(value);
        // eslint-disable-next-line no-empty
    } catch {}
    return '[object Unknown]';
}
