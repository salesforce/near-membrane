import { partialStructuredClone } from '../../dist/index.mjs.js';

describe('partialStructuredClone', () => {
    it('clones own properties of arrays', () => {
        // The resulting array has at least `index` and `input` properties added.
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec#return_value
        const expected = /a/.exec('a');
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
});
