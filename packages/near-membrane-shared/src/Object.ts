import { ReflectApply } from './Reflect';
import type { Getter, Setter } from './types';

const ObjectCtor = Object;
const { prototype: ObjectProto } = ObjectCtor;

export const { assign: ObjectAssign, freeze: ObjectFreeze, keys: ObjectKeys } = ObjectCtor;

const { hasOwn: OriginalObjectHasOwn } = ObjectCtor as any;

const {
    __lookupGetter__: ObjectProtoLookupGetter,
    __lookupSetter__: ObjectProtoLookupSetter,
    hasOwnProperty: ObjectProtoHasOwnProperty,
} = ObjectProto as any;

const ObjectHasOwn: (object: any, key: PropertyKey) => boolean =
    typeof OriginalObjectHasOwn === 'function'
        ? OriginalObjectHasOwn
        : /* istanbul ignore next: currently unreachable via tests */ function ObjectHasOwn(
              object: any,
              key: PropertyKey
          ): boolean {
              return ReflectApply(ObjectProtoHasOwnProperty, object, [key]);
          };

export const { toString: ObjectProtoToString } = ObjectProto;

export function isObject(value: any): boolean {
    return typeof value === 'object' && value !== null;
}

export function ObjectLookupOwnGetter(object: any, key: PropertyKey): Getter | undefined {
    return object === null || object === undefined || !ObjectHasOwn(object, key)
        ? undefined
        : ReflectApply(ObjectProtoLookupGetter, object, [key]);
}

export function ObjectLookupOwnSetter(object: any, key: PropertyKey): Setter | undefined {
    return object === null || object === undefined || !ObjectHasOwn(object, key)
        ? undefined
        : ReflectApply(ObjectProtoLookupSetter, object, [key]);
}
