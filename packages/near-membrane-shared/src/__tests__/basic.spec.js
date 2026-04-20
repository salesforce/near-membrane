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

    describe('getBrandByTrialAndError failure paths', () => {
        it('object with byteLength + @@toStringTag that is not an ArrayBuffer', () => {
            const fake = { byteLength: 0, [TO_STRING_TAG_SYMBOL]: 'Fake' };
            expect(getBrand(fake)).toBe('[object Object]');
        });
        it('object with get/size + @@toStringTag that is not a Map', () => {
            const fake = { get() {}, size: 0, [TO_STRING_TAG_SYMBOL]: 'Fake' };
            expect(getBrand(fake)).toBe('[object Object]');
        });
        it('object with add/size + @@toStringTag that is not a Set', () => {
            const fake = { add() {}, size: 0, [TO_STRING_TAG_SYMBOL]: 'Fake' };
            expect(getBrand(fake)).toBe('[object Object]');
        });
        it('object with get (no size) + @@toStringTag that is not a WeakMap', () => {
            const fake = { get() {}, [TO_STRING_TAG_SYMBOL]: 'Fake' };
            expect(getBrand(fake)).toBe('[object Object]');
        });
        it('object with add (no size) + @@toStringTag that is not a WeakSet', () => {
            const fake = { add() {}, [TO_STRING_TAG_SYMBOL]: 'Fake' };
            expect(getBrand(fake)).toBe('[object Object]');
        });
        it('object with toPrecision + @@toStringTag that is not a Number', () => {
            const fake = { toPrecision() {}, [TO_STRING_TAG_SYMBOL]: 'Fake' };
            expect(getBrand(fake)).toBe('[object Object]');
        });
        it('object with description + @@toStringTag that is not a Symbol', () => {
            const fake = { description: 'x', [TO_STRING_TAG_SYMBOL]: 'Fake' };
            expect(getBrand(fake)).toBe('[object Object]');
        });
        it('object with lastIndex + @@toStringTag that is not a RegExp', () => {
            const fake = { lastIndex: 0, [TO_STRING_TAG_SYMBOL]: 'Fake' };
            Object.defineProperty(fake, 'lastIndex', { value: 0 });
            expect(getBrand(fake)).toBe('[object Object]');
        });
        it('object with length (own) + @@toStringTag that is not a String', () => {
            const fake = { length: 0, [TO_STRING_TAG_SYMBOL]: 'Fake' };
            expect(getBrand(fake)).toBe('[object Object]');
        });
        it('object with @@toStringTag that falls through all checks', () => {
            const fake = { [TO_STRING_TAG_SYMBOL]: 'Fake' };
            expect(getBrand(fake)).toBe('[object Object]');
        });
        it('Map with @@toStringTag still detected as Map', () => {
            const map = new Map();
            Object.defineProperty(map, TO_STRING_TAG_SYMBOL, {
                value: 'Fake',
                configurable: true,
            });
            expect(getBrand(map)).toBe('[object Map]');
        });
        it('Set with @@toStringTag still detected as Set', () => {
            const set = new Set();
            Object.defineProperty(set, TO_STRING_TAG_SYMBOL, {
                value: 'Fake',
                configurable: true,
            });
            expect(getBrand(set)).toBe('[object Set]');
        });
        it('WeakMap with @@toStringTag still detected as WeakMap', () => {
            const wm = new WeakMap();
            Object.defineProperty(wm, TO_STRING_TAG_SYMBOL, {
                value: 'Fake',
                configurable: true,
            });
            expect(getBrand(wm)).toBe('[object WeakMap]');
        });
        it('WeakSet with @@toStringTag still detected as WeakSet', () => {
            const ws = new WeakSet();
            Object.defineProperty(ws, TO_STRING_TAG_SYMBOL, {
                value: 'Fake',
                configurable: true,
            });
            expect(getBrand(ws)).toBe('[object WeakSet]');
        });
        it('Symbol wrapper with @@toStringTag still detected as Symbol', () => {
            const sym = Object(Symbol(''));
            Object.defineProperty(sym, TO_STRING_TAG_SYMBOL, {
                value: 'Fake',
                configurable: true,
            });
            expect(getBrand(sym)).toBe('[object Symbol]');
        });
    });
});
