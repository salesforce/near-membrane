import {
    SetCtor,
    SetProtoAdd,
    SetProtoSizeGetter,
    SetProtoValues,
    toSafeSet,
} from '../../dist/index.mjs.js';

describe('Set', () => {
    it('SetCtor', () => {
        expect(SetCtor).toBe(Set);
    });
    it('SetProtoAdd', () => {
        expect(SetProtoAdd).toBe(Set.prototype.add);
    });
    it('SetProtoSizeGetter', () => {
        expect(SetProtoSizeGetter).toBe(
            Reflect.getOwnPropertyDescriptor(Set.prototype, 'size').get
        );
    });
    it('SetProtoValues', () => {
        expect(SetProtoValues).toBe(Set.prototype.values);
    });
    it('toSafeSet', () => {
        const set = new Set();
        expect(Reflect.ownKeys(set)).toEqual([]);
        expect(toSafeSet(set)).toBe(set);
        expect(Reflect.ownKeys(set)).toEqual([
            'add',
            'clear',
            'delete',
            'entries',
            'forEach',
            'has',
            'keys',
            'size',
            'values',
            Symbol.iterator,
            Symbol.toStringTag,
        ]);
        expect(set.add).toBe(Set.prototype.add);
        expect(set.clear).toBe(Set.prototype.clear);
        expect(set.constructor).toBe(Set);
        expect(set.delete).toBe(Set.prototype.delete);
        expect(set.entries).toBe(Set.prototype.entries);
        expect(set.forEach).toBe(Set.prototype.forEach);
        expect(set.has).toBe(Set.prototype.has);
        expect(set.keys).toBe(Set.prototype.keys);
        expect(Reflect.getOwnPropertyDescriptor(set, 'size')).toEqual({
            configurable: true,
            enumerable: true,
            get: Reflect.getOwnPropertyDescriptor(Set.prototype, 'size').get,
            set: undefined,
        });
        expect(set.values).toBe(Set.prototype.values);
        expect(Reflect.getOwnPropertyDescriptor(set, Symbol.iterator)).toEqual({
            configurable: true,
            enumerable: true,
            value: Set.prototype[Symbol.iterator],
            writable: true,
        });
        expect(Reflect.getOwnPropertyDescriptor(set, Symbol.toStringTag)).toEqual({
            configurable: true,
            enumerable: true,
            value: Set.prototype[Symbol.toStringTag],
            writable: true,
        });
    });
});
