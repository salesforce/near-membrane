const {
    __lookupGetter__: ObjectProto__lookupGetter__,
    hasOwnProperty: ObjectProtoHasOwnProperty,
} = Object.prototype as any;

const { test: RegExpProtoTest } = RegExp.prototype;
const { has: SetProtoHas } = Set.prototype;

const {
    get: WeakMapProtoGet,
    has: WeakMapProtoHas,
    set: WeakMapProtoSet,
} = WeakMap.prototype;

export const ArrayCtor = Array;
export const ErrorCtor = Error;
export const SetCtor = Set;
export const WeakMapCtor = WeakMap;

export const { isArray: ArrayIsArray } = Array;

export const {
    assign: ObjectAssign,
    create: ObjectCreate,
    defineProperties: ObjectDefineProperties,
    defineProperty: ObjectDefineProperty,
    freeze: ObjectFreeze,
    getOwnPropertyDescriptors: ObjectGetOwnPropertyDescriptors,
} = Object;

export const { revocable: ProxyRevocable } = Proxy;

export const {
    apply: ReflectApply,
    construct: ReflectConstruct,
    getPrototypeOf: ReflectGetPrototypeOf,
    setPrototypeOf: ReflectSetPrototypeOf,
    defineProperty: ReflectDefineProperty,
    isExtensible: ReflectIsExtensible,
    getOwnPropertyDescriptor: ReflectGetOwnPropertyDescriptor,
    ownKeys: ReflectOwnKeys,
    preventExtensions: ReflectPreventExtensions,
    deleteProperty: ReflectDeleteProperty,
    has: ReflectHas,
    get: ReflectGet,
    set: ReflectSet,
} = Reflect;

export function ObjectHasOwnProperty(obj: object | undefined, key: PropertyKey): boolean {
    return obj !== null && obj !== undefined && ReflectApply(ObjectProtoHasOwnProperty, obj, [key]);
}

export function ObjectLookupOwnGetter(obj: object, key: PropertyKey): Function | undefined {
    if (obj === null || obj === undefined || !ReflectApply(ObjectProtoHasOwnProperty, obj, [key])) {
        return undefined;
    }
    return ReflectApply(ObjectProto__lookupGetter__, obj, [key]);
}

export function RegExpTest(regexp: RegExp, str: string): boolean {
  return ReflectApply(RegExpProtoTest, regexp, [str]);
}

export function SetHas(set: Set<any>, key: any): boolean {
    return ReflectApply(SetProtoHas, set, [key]);
}

export function WeakMapGet(map: WeakMap<object, object>, key: object): object | undefined {
    return ReflectApply(WeakMapProtoGet, map, [key]);
}

export function WeakMapHas(map: WeakMap<object, object>, key: object): boolean {
    return ReflectApply(WeakMapProtoHas, map, [key]);
}

export function WeakMapSet(map: WeakMap<object, object>, key: object, value: object): WeakMap<object, object> {
    return ReflectApply(WeakMapProtoSet, map, [key, value]);
}

export const emptyArray: [] = [];
