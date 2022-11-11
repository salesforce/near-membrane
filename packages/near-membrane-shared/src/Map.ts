import { ObjectLookupOwnGetter } from './Object';
import { ReflectDefineProperty, ReflectSetPrototypeOf } from './Reflect';
import { SymbolIterator, SymbolToStringTag } from './Symbol';

export const MapCtor = Map;

const { prototype: MapProto } = MapCtor;

const {
    clear: MapProtoClear,
    delete: MapProtoDelete,
    forEach: MapProtoForEach,
    get: MapProtoGet,
    has: MapProtoHas,
    keys: MapProtoKeys,
    values: MapProtoValues,
    [SymbolIterator]: MapProtoSymbolIterator,
    [SymbolToStringTag]: MapProtoSymbolToStringTag,
} = MapProto as any;

export const { entries: MapProtoEntries, set: MapProtoSet } = MapProto;

export const MapProtoSizeGetter = ObjectLookupOwnGetter(MapProto, 'size')!;

export function toSafeMap<T extends Map<any, any>>(map: T): T {
    ReflectSetPrototypeOf(map, null);
    map.clear = MapProtoClear;
    map.delete = MapProtoDelete;
    map.entries = MapProtoEntries;
    map.forEach = MapProtoForEach;
    map.get = MapProtoGet;
    map.has = MapProtoHas;
    map.keys = MapProtoKeys;
    map.set = MapProtoSet as any;
    ReflectDefineProperty(map, 'size', {
        __proto__: null,
        configurable: true,
        enumerable: true,
        get: MapProtoSizeGetter,
        set: undefined,
    } as PropertyDescriptor);
    map.values = MapProtoValues;
    (map as any)[SymbolIterator] = MapProtoSymbolIterator;
    (map as any)[SymbolToStringTag] = MapProtoSymbolToStringTag;
    ReflectSetPrototypeOf(map, MapProto);
    return map;
}
