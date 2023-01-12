import { toSafeWeakSet, WeakSetCtor, WeakSetProtoHas } from '../../dist/index.mjs.js';

describe('WeakSet', () => {
    it('toSafeWeakSet', () => {
        const weakSet = new WeakSet();
        expect(Reflect.ownKeys(weakSet)).toEqual([]);
        expect(toSafeWeakSet(weakSet)).toBe(weakSet);
        expect(Reflect.ownKeys(weakSet)).toEqual(['add', 'delete', 'has', Symbol.toStringTag]);
        expect(weakSet.add).toBe(WeakSet.prototype.add);
        expect(weakSet.constructor).toBe(WeakSet);
        expect(weakSet.delete).toBe(WeakSet.prototype.delete);
        expect(Reflect.getOwnPropertyDescriptor(weakSet, Symbol.toStringTag)).toEqual({
            configurable: true,
            enumerable: true,
            value: WeakSet.prototype[Symbol.toStringTag],
            writable: true,
        });
    });
    it('WeakSetCtor', () => {
        expect(WeakSetCtor).toBe(WeakSet);
    });
    it('WeakSetProtoHas', () => {
        expect(WeakSetProtoHas).toBe(WeakSet.prototype.has);
    });
});
