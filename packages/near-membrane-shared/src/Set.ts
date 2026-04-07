import { ObjectLookupOwnGetter } from './Object';
import { ReflectDefineProperty, ReflectSetPrototypeOf } from './Reflect';
import { SymbolIterator, SymbolToStringTag } from './Symbol';

export const SetCtor = Set;

const { prototype: SetProto } = SetCtor;

const {
    clear: SetProtoClear,
    delete: SetProtoDelete,
    entries: SetProtoEntries,
    forEach: SetProtoForEach,
    keys: SetProtoKeys,
    [SymbolIterator]: SetProtoSymbolIterator,
    [SymbolToStringTag]: SetProtoSymbolToStringTag,
} = SetProto as any;

export const { add: SetProtoAdd, has: SetProtoHas, values: SetProtoValues } = SetProto;

export const SetProtoSizeGetter = ObjectLookupOwnGetter(SetProto, 'size')!;

export function toSafeSet<T extends Set<any>>(set: T): T {
    ReflectSetPrototypeOf(set, null);
    set.add = SetProtoAdd as any;
    set.clear = SetProtoClear;
    set.delete = SetProtoDelete;
    set.entries = SetProtoEntries;
    set.forEach = SetProtoForEach;
    set.has = SetProtoHas;
    set.keys = SetProtoKeys;
    ReflectDefineProperty(set, 'size', {
        __proto__: null,
        configurable: true,
        enumerable: true,
        get: SetProtoSizeGetter,
        set: undefined,
    } as PropertyDescriptor);
    set.values = SetProtoValues;
    (set as any)[SymbolIterator] = SetProtoSymbolIterator;
    (set as any)[SymbolToStringTag] = SetProtoSymbolToStringTag;
    ReflectSetPrototypeOf(set, SetProto);
    return set;
}
