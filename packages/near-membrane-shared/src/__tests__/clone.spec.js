import { partialStructuredClone } from '../../dist/index.mjs.js';

describe('partialStructuredClone', () => {
    it('clones own properties of arrays', () => {
        // The resulting array has at least `index` and `input` properties added.
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec#return_value
        const expected = /a/.exec('a');
        expect(partialStructuredClone(expected)).toEqual(expected);
    });
    it('clones regexp', () => {
        const expected = /a/;
        expect(partialStructuredClone(expected)).toEqual(expected);
    });
    it('returns non-object', () => {
        const expected = '1';
        expect(partialStructuredClone(expected)).toEqual(expected);
    });
    it('clones circular references', () => {
        const circular = {};
        circular.circular = circular;
        const actual = partialStructuredClone(circular);
        expect(actual === actual.circular).toBe(true);
    });
    it('clones big int data types', () => {
        const expected = [
            BigInt(0x1fffffffffffff),
            Object(BigInt(0x1fffffffffffff)),
            new BigInt64Array(),
            new BigUint64Array(),
        ];
        const actual = partialStructuredClone(expected);
        expect(actual).toEqual(expected);
    });
    it('clones errors', () => {
        const expected = [
            new DOMException('dom exception', 'InvalidStateError'),
            new EvalError('eval error'),
            new RangeError('range error'),
            new ReferenceError('reference error'),
            new SyntaxError('syntax error'),
            new TypeError('type error'),
            new URIError('URI error'),
        ];
        const actual = partialStructuredClone(expected);
        expect(actual).toEqual(expected);
    });
    it('clones shared array buffers', () => {
        const expected = new SharedArrayBuffer();
        const actual = partialStructuredClone(expected);
        expect(actual).toEqual(expected);
    });
    it('clones objects containing symbol values', () => {
        const expected = { symbol: Symbol('X') };
        const actual = partialStructuredClone(expected);
        expect(actual).toEqual(expected);
    });
    it('clones objects containing Map values', () => {
        const key = {};
        const value = {};
        const expected = { map: new Map([[key, value]]) };
        const actual = partialStructuredClone(expected);
        expect(actual).toEqual(expected);
    });
    it('clones objects containing Set values', () => {
        const value = {};
        const expected = { set: new Set([value]) };
        const actual = partialStructuredClone(expected);
        expect(actual).toEqual(expected);
    });
    it('clones objects with null prototype', () => {
        const expected = Object.create(null);
        expected.x = 1;
        expected.y = 'hello';
        const actual = partialStructuredClone(expected);
        expect(actual).not.toBe(expected);
        expect(actual.x).toBe(1);
        expect(actual.y).toBe('hello');
    });
    it('clones nested objects (depth > 1)', () => {
        const expected = { a: { b: { c: 42 } } };
        const actual = partialStructuredClone(expected);
        expect(actual).toEqual(expected);
        expect(actual).not.toBe(expected);
        expect(actual.a).not.toBe(expected.a);
        expect(actual.a.b).not.toBe(expected.a.b);
    });
    it('clones objects with cross-document-like prototype', () => {
        const crossDocProto = Object.create(null);
        crossDocProto.marker = 'cross';
        const obj = Object.create(crossDocProto);
        obj.x = 1;
        const actual = partialStructuredClone(obj);
        expect(actual).not.toBe(obj);
        expect(actual.x).toBe(1);
    });
    it('handles objects containing function values', () => {
        const fn = () => {};
        const original = { fn };
        const actual = partialStructuredClone(original);
        expect(actual.fn).toBe(fn);
    });
    it('returns non-cloneable platform objects by reference', () => {
        const date = new Date();
        const actual = partialStructuredClone(date);
        expect(actual).toBe(date);
    });
    it('returns boxed Boolean by reference for non-proxy', () => {
        const boxed = Object(true);
        const actual = partialStructuredClone(boxed);
        expect(actual).toBe(boxed);
    });
    it('returns boxed Number by reference for non-proxy', () => {
        const boxed = Object(42);
        const actual = partialStructuredClone(boxed);
        expect(actual).toBe(boxed);
    });
    it('returns boxed String by reference for non-proxy', () => {
        const boxed = Object('hello');
        const actual = partialStructuredClone(boxed);
        expect(actual).toBe(boxed);
    });
    it('returns function by reference for non-proxy', () => {
        const fn = function namedFn() {};
        const actual = partialStructuredClone(fn);
        expect(actual).toBe(fn);
    });
    it('returns arrow function by reference for non-proxy', () => {
        const fn = () => 42;
        const actual = partialStructuredClone(fn);
        expect(actual).toBe(fn);
    });
    it('returns symbol directly and breaks the queue', () => {
        const sym = Symbol('direct');
        const actual = partialStructuredClone(sym);
        expect(actual).toBe(sym);
    });
    it('returns Error by reference for non-proxy', () => {
        const err = new Error('test');
        const actual = partialStructuredClone(err);
        expect(actual).toBe(err);
    });
    it('returns TypeError by reference for non-proxy', () => {
        const err = new TypeError('test');
        const actual = partialStructuredClone(err);
        expect(actual).toBe(err);
    });
    it('returns ArrayBuffer by reference for non-proxy', () => {
        const buf = new ArrayBuffer(8);
        const actual = partialStructuredClone(buf);
        expect(actual).toBe(buf);
    });
    it('returns TypedArray by reference for non-proxy', () => {
        const arr = new Uint8Array([1, 2, 3]);
        const actual = partialStructuredClone(arr);
        expect(actual).toBe(arr);
    });
    it('clones empty Map', () => {
        const expected = { map: new Map() };
        const actual = partialStructuredClone(expected);
        expect(actual).toEqual(expected);
        expect(actual.map).not.toBe(expected.map);
        expect(actual.map.size).toBe(0);
    });
    it('clones empty Set', () => {
        const expected = { set: new Set() };
        const actual = partialStructuredClone(expected);
        expect(actual).toEqual(expected);
        expect(actual.set).not.toBe(expected.set);
        expect(actual.set.size).toBe(0);
    });
    it('passes through primitive values unchanged', () => {
        expect(partialStructuredClone(null)).toBe(null);
        expect(partialStructuredClone(undefined)).toBe(undefined);
        expect(partialStructuredClone(42)).toBe(42);
        expect(partialStructuredClone('hello')).toBe('hello');
        expect(partialStructuredClone(true)).toBe(true);
    });
    it('passes through bigint primitive unchanged', () => {
        const big = BigInt(123);
        expect(partialStructuredClone(big)).toBe(big);
    });
    it('recovers from internal errors and returns original value', () => {
        const trap = new Proxy(
            {},
            {
                getPrototypeOf() {
                    throw new Error('trap');
                },
            }
        );
        const actual = partialStructuredClone(trap);
        expect(actual).toBe(trap);
    });
    it('clones Map with multiple entries preserving order', () => {
        const map = new Map([
            ['a', 1],
            ['b', 2],
            ['c', 3],
        ]);
        const expected = { map };
        const actual = partialStructuredClone(expected);
        expect(actual.map).not.toBe(map);
        expect([...actual.map.keys()]).toEqual(['a', 'b', 'c']);
        expect([...actual.map.values()]).toEqual([1, 2, 3]);
    });
    it('clones Set with multiple entries preserving order', () => {
        const set = new Set(['x', 'y', 'z']);
        const expected = { set };
        const actual = partialStructuredClone(expected);
        expect(actual.set).not.toBe(set);
        expect([...actual.set]).toEqual(['x', 'y', 'z']);
    });
    it('clones Map with object keys and values', () => {
        const key1 = { id: 1 };
        const key2 = { id: 2 };
        const val1 = { data: 'a' };
        const val2 = { data: 'b' };
        const map = new Map([
            [key1, val1],
            [key2, val2],
        ]);
        const expected = { map };
        const actual = partialStructuredClone(expected);
        expect(actual.map.size).toBe(2);
    });
    it('clones Set with object entries', () => {
        const entry1 = { id: 1 };
        const entry2 = { id: 2 };
        const set = new Set([entry1, entry2]);
        const expected = { set };
        const actual = partialStructuredClone(expected);
        expect(actual.set.size).toBe(2);
    });
    it('clones array with holes (sparse array)', () => {
        // eslint-disable-next-line no-sparse-arrays
        const expected = [1, , 3];
        const actual = partialStructuredClone(expected);
        expect(actual.length).toBe(3);
        expect(actual[0]).toBe(1);
        expect(actual[2]).toBe(3);
        expect(1 in actual).toBe(false);
    });
    it('clones deeply nested Map inside object inside array', () => {
        const inner = new Map([['nested', true]]);
        const expected = [{ map: inner }];
        const actual = partialStructuredClone(expected);
        expect(actual).not.toBe(expected);
        expect(actual[0].map).not.toBe(inner);
        expect(actual[0].map.get('nested')).toBe(true);
    });
    it('handles object with non-enumerable prototype that has null grandparent', () => {
        const foreignProto = Object.create(null);
        const obj = Object.create(foreignProto);
        obj.value = 42;
        const actual = partialStructuredClone(obj);
        expect(actual).not.toBe(obj);
        expect(actual.value).toBe(42);
    });
    it('skips non-Object-branded objects with custom prototype', () => {
        function Custom() {
            this.x = 1;
        }
        Custom.prototype.y = 2;
        const obj = new Custom();
        const actual = partialStructuredClone(obj);
        expect(actual).toBe(obj);
    });
});
