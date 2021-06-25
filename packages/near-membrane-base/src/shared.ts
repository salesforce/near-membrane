export const ArrayCtor = Array;
export const { isArray: ArrayIsArray } = Array;

export const emptyArray: [] = [];
export const ErrorCtor = Error;

export const {
    assign: ObjectAssign,
    defineProperties: ObjectDefineProperties,
    defineProperty: ObjectDefineProperty,
    freeze: ObjectFreeze,
    getOwnPropertyDescriptors: ObjectGetOwnPropertyDescriptors,
} = Object;

const {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __lookupGetter__: ObjectProto__lookupGetter__,
    hasOwnProperty: ObjectProtoHasOwnProperty,
} = Object.prototype as any;

export function ObjectHasOwnProperty(obj: object | undefined, key: PropertyKey): boolean {
    return obj !== null && obj !== undefined && ReflectApply(ObjectProtoHasOwnProperty, obj, [key]);
}

export function ObjectLookupOwnGetter(obj: object, key: PropertyKey): Function | undefined {
    if (obj === null || obj === undefined || !ReflectApply(ObjectProtoHasOwnProperty, obj, [key])) {
        return undefined;
    }
    return ReflectApply(ObjectProto__lookupGetter__, obj, [key]);
}

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

const { test: RegExpProtoTest } = RegExp.prototype;

export function RegExpTest(regexp: RegExp, str: string): boolean {
    return ReflectApply(RegExpProtoTest, regexp, [str]);
}

export const SetCtor = Set;
const { has: SetProtoHas } = Set.prototype;

export function SetHas(set: Set<any>, key: any): boolean {
    return ReflectApply(SetProtoHas, set, [key]);
}

export const TypeErrorCtor = TypeError;

export const WeakMapCtor = WeakMap;
const { get: WeakMapProtoGet, set: WeakMapProtoSet } = WeakMap.prototype;

export function WeakMapGet(map: WeakMap<object, object>, key: object): object | undefined {
    return ReflectApply(WeakMapProtoGet, map, [key]);
}

export function WeakMapSet(
    map: WeakMap<object, object>,
    key: object,
    value: object
): WeakMap<object, object> {
    return ReflectApply(WeakMapProtoSet, map, [key, value]);
}
