import { ReflectSetPrototypeOf } from './Reflect';
import { SymbolToStringTag } from './Symbol';

export const WeakSetCtor = WeakSet;

const { prototype: WeakSetProto } = WeakSetCtor;

export const { has: WeakSetProtoHas } = WeakSetProto;

const {
    add: WeakSetProtoAdd,
    delete: WeakSetProtoDelete,
    [SymbolToStringTag]: WeakSetProtoSymbolToStringTag,
} = WeakSetProto as any;

export function toSafeWeakSet<T extends WeakSet<any>>(weakSet: T): T {
    ReflectSetPrototypeOf(weakSet, null);
    weakSet.add = WeakSetProtoAdd;
    weakSet.delete = WeakSetProtoDelete;
    weakSet.has = WeakSetProtoHas;
    (weakSet as any)[SymbolToStringTag] = WeakSetProtoSymbolToStringTag;
    ReflectSetPrototypeOf(weakSet, WeakSetProto);
    return weakSet;
}
