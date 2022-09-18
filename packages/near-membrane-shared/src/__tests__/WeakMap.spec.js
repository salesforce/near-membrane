import { toSafeWeakMap, WeakMapCtor } from '../../dist/index';

describe('WeakMap', () => {
    it('toSafeWeakMap', () => {
        const weakMap = new WeakMap();
        expect(Reflect.ownKeys(weakMap)).toEqual([]);
        expect(toSafeWeakMap(weakMap)).toBe(weakMap);
        expect(Reflect.ownKeys(weakMap)).toEqual([
            'delete',
            'get',
            'has',
            'set',
            Symbol.toStringTag,
        ]);
        expect(weakMap.constructor).toBe(WeakMap);
        expect(weakMap.delete).toBe(WeakMap.prototype.delete);
        expect(weakMap.get).toBe(WeakMap.prototype.get);
        expect(weakMap.has).toBe(WeakMap.prototype.has);
        expect(weakMap.set).toBe(WeakMap.prototype.set);
        expect(Reflect.getOwnPropertyDescriptor(weakMap, Symbol.toStringTag)).toEqual({
            configurable: true,
            enumerable: true,
            value: WeakMap.prototype[Symbol.toStringTag],
            writable: true,
        });
    });
    it('WeakMapCtor', () => {
        expect(WeakMapCtor).toBe(WeakMap);
    });
});
