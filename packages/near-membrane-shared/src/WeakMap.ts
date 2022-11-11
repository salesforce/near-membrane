import { ReflectSetPrototypeOf } from './Reflect';
import { SymbolToStringTag } from './Symbol';

export const WeakMapCtor = WeakMap;

const { prototype: WeakMapProto } = WeakMapCtor;

export const { has: WeakMapProtoHas } = WeakMapProto;

const {
    delete: WeakMapProtoDelete,
    get: WeakMapProtoGet,
    set: WeakMapProtoSet,
    [SymbolToStringTag]: WeakMapProtoSymbolToStringTag,
} = WeakMapProto as any;

export function toSafeWeakMap<T extends WeakMap<any, any>>(weakMap: T): T {
    ReflectSetPrototypeOf(weakMap, null);
    weakMap.delete = WeakMapProtoDelete;
    weakMap.get = WeakMapProtoGet;
    weakMap.has = WeakMapProtoHas;
    weakMap.set = WeakMapProtoSet;
    (weakMap as any)[SymbolToStringTag] = WeakMapProtoSymbolToStringTag;
    ReflectSetPrototypeOf(weakMap, WeakMapProto);
    return weakMap;
}
