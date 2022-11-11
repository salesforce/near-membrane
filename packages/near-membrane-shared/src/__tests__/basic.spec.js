import { getBrand } from '../../dist/index.mjs.js';

const { toStringTag: TO_STRING_TAG_SYMBOL } = Symbol;

describe('basic', () => {
    it('getBrand', () => {
        expect(getBrand([])).toBe('[object Array]');
        expect(getBrand(new ArrayBuffer())).toBe('[object ArrayBuffer]');
        expect(getBrand(true)).toBe('[object Boolean]');
        expect(getBrand(Object(true))).toBe('[object Boolean]');
        expect(getBrand(new Date())).toBe('[object Date]');
        expect(getBrand(() => {})).toBe('[object Function]');
        expect(getBrand(async () => {})).toBe('[object Function]');
        // eslint-disable-next-line no-empty-function
        expect(getBrand(async function* () {})).toBe('[object Function]');
        // eslint-disable-next-line no-empty-function
        expect(getBrand(function* () {})).toBe('[object Function]');
        expect(getBrand({})).toBe('[object Object]');
        expect(getBrand({ __proto__: null })).toBe('[object Object]');
        expect(getBrand(null)).toBe('[object Null]');
        expect(getBrand(1)).toBe('[object Number]');
        expect(getBrand(1n)).toBe('[object BigInt]');
        expect(getBrand(Object(1n))).toBe('[object BigInt]');

        // eslint-disable-next-line no-new-wrappers
        expect(getBrand(Object(new Boolean()))).toBe('[object Boolean]');
        expect(getBrand(Object(new Date()))).toBe('[object Date]');
        expect(getBrand(Object(1))).toBe('[object Number]');
        expect(getBrand(/a/)).toBe('[object RegExp]');
        expect(getBrand('')).toBe('[object String]');
        expect(getBrand(Object(''))).toBe('[object String]');
        expect(getBrand(Symbol(''))).toBe('[object Symbol]');
        expect(getBrand(Object(Symbol('')))).toBe('[object Symbol]');
        expect(getBrand(undefined)).toBe('[object Undefined]');
        expect(getBrand(new WeakMap())).toBe('[object WeakMap]');
        expect(getBrand(new WeakSet())).toBe('[object WeakSet]');
        expect(getBrand({ [TO_STRING_TAG_SYMBOL]: 'Custom' })).toBe('[object Object]');

        // The following cases will get through getBrand() to reach getBrandByTrialAndError()
        // eslint-disable-next-line no-new-wrappers
        const boolean = new Boolean();
        boolean[TO_STRING_TAG_SYMBOL] = 'boolean';
        expect(getBrand(boolean)).toBe('[object Boolean]');

        // eslint-disable-next-line no-new-wrappers
        const date = new Date();
        date[TO_STRING_TAG_SYMBOL] = 'date';
        expect(getBrand(date)).toBe('[object Date]');

        // eslint-disable-next-line no-new-wrappers
        const number = new Number(1);
        number[TO_STRING_TAG_SYMBOL] = 'number';
        expect(getBrand(number)).toBe('[object Number]');

        // eslint-disable-next-line prefer-regex-literals
        const regexp = new RegExp('');
        regexp[TO_STRING_TAG_SYMBOL] = 'regexp';
        expect(getBrand(regexp)).toBe('[object RegExp]');

        // eslint-disable-next-line no-new-wrappers
        const string = new String('');
        string[TO_STRING_TAG_SYMBOL] = 'string';
        expect(getBrand(string)).toBe('[object String]');
    });
});
