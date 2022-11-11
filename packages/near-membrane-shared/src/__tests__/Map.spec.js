import { MapCtor, MapProtoEntries, MapProtoSet, toSafeMap } from '../../dist/index.mjs.js';

describe('Map', () => {
    it('MapCtor', () => {
        expect(MapCtor).toBe(Map);
    });
    it('MapProtoEntries', () => {
        expect(MapProtoEntries).toBe(Map.prototype.entries);
    });
    it('MapProtoSet', () => {
        expect(MapProtoSet).toBe(Map.prototype.set);
    });
    it('toSafeMap', () => {
        const map = new Map();
        expect(Reflect.ownKeys(map)).toEqual([]);
        expect(toSafeMap(map)).toBe(map);
        expect(Reflect.ownKeys(map)).toEqual([
            'clear',
            'delete',
            'entries',
            'forEach',
            'get',
            'has',
            'keys',
            'set',
            'size',
            'values',
            Symbol.iterator,
            Symbol.toStringTag,
        ]);
        expect(map.clear).toBe(Map.prototype.clear);
        expect(map.constructor).toBe(Map);
        expect(map.delete).toBe(Map.prototype.delete);
        expect(map.entries).toBe(Map.prototype.entries);
        expect(map.forEach).toBe(Map.prototype.forEach);
        expect(map.get).toBe(Map.prototype.get);
        expect(map.has).toBe(Map.prototype.has);
        expect(map.keys).toBe(Map.prototype.keys);
        expect(map.set).toBe(Map.prototype.set);
        expect(Reflect.getOwnPropertyDescriptor(map, 'size')).toEqual({
            configurable: true,
            enumerable: true,
            get: Reflect.getOwnPropertyDescriptor(Map.prototype, 'size').get,
            set: undefined,
        });
        expect(map.values).toBe(Map.prototype.values);
        expect(Reflect.getOwnPropertyDescriptor(map, Symbol.iterator)).toEqual({
            configurable: true,
            enumerable: true,
            value: Map.prototype[Symbol.iterator],
            writable: true,
        });
        expect(Reflect.getOwnPropertyDescriptor(map, Symbol.toStringTag)).toEqual({
            configurable: true,
            enumerable: true,
            value: Map.prototype[Symbol.toStringTag],
            writable: true,
        });
    });
});
