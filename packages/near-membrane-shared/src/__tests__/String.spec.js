import {
    capitalizeFirstChar,
    enquote,
    extractFunctionBodySource,
    StringCtor,
    StringProtoEndsWith,
    StringProtoIncludes,
    StringProtoIndexOf,
    StringProtoNormalize,
    StringProtoReplace,
    StringProtoSlice,
    StringProtoSplit,
    StringProtoStartsWith,
    StringProtoToLowerCase,
    StringProtoToUpperCase,
    StringProtoValueOf,
    toSafeStringValue,
    toSafeTemplateStringValue,
} from '../../dist/index.mjs.js';

const CUSTOM_URL_TO_STRING_RESULT = 'Custom URL toString() result';

class URLSubclass extends URL {
    // eslint-disable-next-line class-methods-use-this
    toString() {
        return CUSTOM_URL_TO_STRING_RESULT;
    }
}

const revokedProxy = (() => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();
    return proxy;
})();

describe('String', () => {
    it('capitalizeFirstChar', () => {
        expect(capitalizeFirstChar('x')).toBe('X');
        expect(capitalizeFirstChar('XY')).toBe('XY');
        expect(capitalizeFirstChar('xy')).toBe('Xy');
        expect(capitalizeFirstChar('')).toBe('');
    });
    it('enquote', () => {
        expect(enquote('a')).toBe("'a'");
        expect(enquote('a', '"')).toBe('"a"');
        expect(enquote("'", "'")).toBe("'\\''");
        expect(enquote('"', '"')).toBe('"\\""');
    });
    it('extractFunctionBodySource', () => {
        expect(extractFunctionBodySource(() => 'arrow with no brackets').trim()).toBe(
            "'arrow with no brackets'"
        );
        const x = undefined;
        expect(extractFunctionBodySource(() => x).trim()).toBe('x');
        expect(
            // eslint-disable-next-line arrow-body-style
            extractFunctionBodySource(() => {
                return 'arrow with brackets';
            }).trim()
        ).toBe("return 'arrow with brackets';");
        expect(
            // eslint-disable-next-line prefer-arrow-callback
            extractFunctionBodySource(function () {
                return 'anonymous';
            }).trim()
        ).toBe("return 'anonymous';");
        expect(
            extractFunctionBodySource(function named() {
                return named;
            }).trim()
        ).toBe('return named;');
        expect(
            // eslint-disable-next-line prefer-arrow-callback
            extractFunctionBodySource(function named() {}).trim()
        ).toBe('');
        expect(
            // eslint-disable-next-line prefer-arrow-callback
            extractFunctionBodySource(function () {}).trim()
        ).toBe('');
        expect(extractFunctionBodySource(Function).trim()).toBe('[native code]');
    });
    it('StringCtor', () => {
        expect(StringCtor).toBe(String);
    });
    it('StringProtoEndsWith', () => {
        expect(StringProtoEndsWith).toBe(String.prototype.endsWith);
    });
    it('StringProtoIncludes', () => {
        expect(StringProtoIncludes).toBe(String.prototype.includes);
    });
    it('StringProtoIndexOf', () => {
        expect(StringProtoIndexOf).toBe(String.prototype.indexOf);
    });
    it('StringProtoNormalize', () => {
        expect(StringProtoNormalize).toBe(String.prototype.normalize);
    });
    it('StringProtoReplace', () => {
        expect(StringProtoReplace).toBe(String.prototype.replace);
    });
    it('StringProtoSlice', () => {
        expect(StringProtoSlice).toBe(String.prototype.slice);
    });
    it('StringProtoSplit', () => {
        expect(StringProtoSplit).toBe(String.prototype.split);
    });
    it('StringProtoStartsWith', () => {
        expect(StringProtoStartsWith).toBe(String.prototype.startsWith);
    });
    it('StringProtoToLowerCase', () => {
        expect(StringProtoToLowerCase).toBe(String.prototype.toLowerCase);
    });
    it('StringProtoToUpperCase', () => {
        expect(StringProtoToUpperCase).toBe(String.prototype.toUpperCase);
    });
    it('StringProtoValueOf', () => {
        expect(StringProtoValueOf).toBe(String.prototype.valueOf);
    });
    it('toSafeStringValue', () => {
        expect(toSafeStringValue('XY')).toBe('XY');
        expect(toSafeStringValue(1)).toBe('1');
        expect(toSafeStringValue(true)).toBe('true');
        expect(toSafeStringValue(false)).toBe('false');
        expect(toSafeStringValue(null)).toBe('null');
        expect(toSafeStringValue(undefined)).toBe('undefined');
        // The following non-specific eslint-disable-next-line directive is
        // necessary to prevent the pre-commit linter from transforming
        // "function () {}" to "() => {}".
        // eslint-disable-next-line
        expect(toSafeStringValue(function () {})).toBe('function () {}');
        expect(toSafeStringValue(() => {})).toBe('() => {}');
        expect(() => toSafeStringValue(revokedProxy)).toThrow();
        expect(() =>
            toSafeStringValue({
                toString() {
                    throw new Error();
                },
            })
        ).toThrow();
        expect(() => toSafeStringValue(Symbol(''))).toThrow();
        expect(() => toSafeStringValue(Object(Symbol('')))).toThrow();
        expect(toSafeStringValue(new URL('https://www.example.com/'))).toBe(
            'https://www.example.com/'
        );
        expect(toSafeStringValue(new URLSubclass('https://www.example.com/'))).toBe(
            CUSTOM_URL_TO_STRING_RESULT
        );

        function nativeDOMFunctionThatAcceptsSomeStringsAndCallsToStringOnThem(first, second) {
            return `${first} + ${second}`;
        }

        function distortionThatForwardsAStringValueToNativeAndUsestoSafeStringValue(...args) {
            // Going through this function without using toSafeStringValue() will result in
            // two calls to args[0]'s toString(). We'll see that the safely stringified value
            // comes out the other side in args[1], despite having toString() called on it again.
            const incomingString = toSafeStringValue(args[0]);

            if (incomingString) {
                args[1] = incomingString;
            }
            return nativeDOMFunctionThatAcceptsSomeStringsAndCallsToStringOnThem(...args);
        }

        const shapeShifter = {
            hasShifted: false,
            toString() {
                if (!this.hasShifted) {
                    this.hasShifted = true;
                    return 'innocuous value';
                }
                return 'malicious value';
            },
        };
        const distortedOutcome =
            distortionThatForwardsAStringValueToNativeAndUsestoSafeStringValue(shapeShifter);

        expect(distortedOutcome).toBe('malicious value + innocuous value');
    });
    it('toSafeTemplateStringValue', () => {
        expect(toSafeTemplateStringValue('XY')).toBe('XY');
        expect(toSafeTemplateStringValue(1)).toBe('1');
        expect(toSafeTemplateStringValue(true)).toBe('true');
        expect(toSafeTemplateStringValue(false)).toBe('false');
        expect(toSafeTemplateStringValue(null)).toBe('null');
        expect(toSafeTemplateStringValue(undefined)).toBe('undefined');
        // The following non-specific eslint-disable-next-line directive is
        // necessary to prevent the pre-commit linter from transforming
        // "function () {}" to "() => {}".
        // eslint-disable-next-line
        expect(toSafeTemplateStringValue(function () {})).toBe('function () {}');
        expect(toSafeTemplateStringValue(() => {})).toBe('() => {}');
        expect(toSafeTemplateStringValue(revokedProxy)).toBe('[object Unknown]');
        expect(
            toSafeTemplateStringValue({
                toString() {
                    throw new Error();
                },
            })
        ).toBe('[object Object]');
        expect(toSafeTemplateStringValue(Symbol(''))).toBe('Symbol()');
        expect(toSafeTemplateStringValue(Object(Symbol('')))).toBe('Symbol()');
        expect(toSafeTemplateStringValue(new URL('https://www.example.com/'))).toBe(
            'https://www.example.com/'
        );
        expect(toSafeTemplateStringValue(new URLSubclass('https://www.example.com/'))).toBe(
            'https://www.example.com/'
        );
    });
});
