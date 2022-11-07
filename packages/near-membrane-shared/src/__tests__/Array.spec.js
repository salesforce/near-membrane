import {
    ArrayCtor,
    ArrayIsArray,
    ArrayProtoIncludes,
    ArrayProtoPush,
    ArrayProtoSort,
    ArrayProtoUnshift,
    toSafeArray,
} from '../../dist/index.mjs.js';

describe('Array', () => {
    it('ArrayCtor', () => {
        expect(ArrayCtor).toBe(Array);
    });
    it('ArrayIsArray', () => {
        expect(ArrayIsArray).toBe(Array.isArray);
    });
    it('ArrayProtoIncludes', () => {
        expect(ArrayProtoIncludes).toBe(Array.prototype.includes);
    });
    it('ArrayProtoPush', () => {
        expect(ArrayProtoPush).toBe(Array.prototype.push);
    });
    it('ArrayProtoSort', () => {
        expect(ArrayProtoSort).toBe(Array.prototype.sort);
    });
    it('ArrayProtoUnshift', () => {
        expect(ArrayProtoUnshift).toBe(Array.prototype.unshift);
    });
    it('toSafeArray', () => {
        const array = [];
        expect(Reflect.ownKeys(array)).toEqual(['length']);
        expect(toSafeArray(array)).toBe(array);
        expect(Reflect.ownKeys(array)).toEqual([
            'length',
            'at',
            'concat',
            'copyWithin',
            'entries',
            'every',
            'fill',
            'filter',
            'find',
            'findIndex',
            'flat',
            'flatMap',
            'forEach',
            'includes',
            'indexOf',
            'join',
            'keys',
            'lastIndexOf',
            'map',
            'pop',
            'push',
            'reduce',
            'reduceRight',
            'reverse',
            'shift',
            'slice',
            'some',
            'sort',
            'splice',
            'toLocaleString',
            'toString',
            'unshift',
            'values',
            Symbol.iterator,
            Symbol.unscopables,
        ]);
        expect(array.at).toBe(Array.prototype.at);
        expect(array.concat).toBe(Array.prototype.concat);
        expect(array.constructor).toBe(Array.prototype.constructor);
        expect(array.copyWithin).toBe(Array.prototype.copyWithin);
        expect(array.entries).toBe(Array.prototype.entries);
        expect(array.every).toBe(Array.prototype.every);
        expect(array.fill).toBe(Array.prototype.fill);
        expect(array.find).toBe(Array.prototype.find);
        expect(array.findIndex).toBe(Array.prototype.findIndex);
        expect(array.flat).toBe(Array.prototype.flat);
        expect(array.flatMap).toBe(Array.prototype.flatMap);
        expect(array.forEach).toBe(Array.prototype.forEach);
        expect(array.includes).toBe(Array.prototype.includes);
        expect(array.indexOf).toBe(Array.prototype.indexOf);
        expect(array.join).toBe(Array.prototype.join);
        expect(array.keys).toBe(Array.prototype.keys);
        expect(array.lastIndexOf).toBe(Array.prototype.lastIndexOf);
        expect(array.map).toBe(Array.prototype.map);
        expect(array.pop).toBe(Array.prototype.pop);
        expect(array.push).toBe(Array.prototype.push);
        expect(array.reduce).toBe(Array.prototype.reduce);
        expect(array.reduceRight).toBe(Array.prototype.reduceRight);
        expect(array.reverse).toBe(Array.prototype.reverse);
        expect(array.shift).toBe(Array.prototype.shift);
        expect(array.slice).toBe(Array.prototype.slice);
        expect(array.some).toBe(Array.prototype.some);
        expect(array.sort).toBe(Array.prototype.sort);
        expect(array.toLocalString).toBe(Array.prototype.toLocalString);
        expect(array.toString).toBe(Array.prototype.toString);
        expect(array.unshift).toBe(Array.prototype.unshift);
        expect(array.values).toBe(Array.prototype.values);
        expect(array[Symbol.iterator]).toBe(Array.prototype[Symbol.iterator]);
        expect(array[Symbol.unscopables]).toEqual(Array.prototype[Symbol.unscopables]);
        expect(array[Symbol.unscopables]).not.toBe(Array.prototype[Symbol.unscopables]);
        expect(Object.isFrozen(array[Symbol.unscopables])).toBe(true);
        expect(Reflect.getOwnPropertyDescriptor(array, Symbol.unscopables)).toEqual({
            enumerable: true,
            configurable: true,
            value: Array.prototype[Symbol.unscopables],
            writable: true,
        });
    });
});
