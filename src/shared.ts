export const { isArray: ArrayIsArray } = Array;

export const {
    assign,
    create: ObjectCreate,
    defineProperty: ObjectDefineProperty,
    getOwnPropertyDescriptors,
    freeze,
    seal,
    isSealed,
    isFrozen,
} = Object;

export const {
    apply,
    construct,
    getPrototypeOf: ReflectGetPrototypeOf,
    setPrototypeOf: ReflectSetPrototypeOf,
    defineProperty: ReflectDefineProperty,
    isExtensible: ReflectIsExtensible,
    getOwnPropertyDescriptor: ReflectGetOwnPropertyDescriptor,
    ownKeys,
    preventExtensions: ReflectPreventExtensions,
    deleteProperty,
    get: ReflectGet,
    set: ReflectSet,
} = Reflect;

const ErrorCreate = unconstruct(Error);
const SetCreate = unconstruct(Set);
const SetHas = unapply(Set.prototype.has);
const ProxyRevocable = Proxy.revocable;
const WeakMapCreate = unconstruct(WeakMap);
const WeakMapGet = unapply(WeakMap.prototype.get);
const WeakMapHas = unapply(WeakMap.prototype.has);
const WeakMapSet = unapply(WeakMap.prototype.set);
const hasOwnProperty = unapply(Object.prototype.hasOwnProperty);
const map = unapply(Array.prototype.map);

export {
    ErrorCreate,
    ProxyRevocable,
    SetCreate,
    SetHas,
    WeakMapCreate,
    WeakMapGet,
    WeakMapHas,
    WeakMapSet,
    hasOwnProperty,
    map,
};

export function unapply(func: Function): Function {
    return (thisArg: any, ...args: any[]) => apply(func, thisArg, args);
}

export function unconstruct(func: Function): Function {
    return (...args: any[]) => construct(func, args);
}

export function isUndefined(obj: any): obj is undefined {
    return obj === undefined;
}

export function isNull(obj: any): obj is null {
    return obj === null;
}

export function isNullOrUndefined(obj: any): obj is (null | undefined) {
    return isNull(obj) || isUndefined(obj);
}

export function isTrue(obj: any): obj is true {
    return obj === true;
}

export function isFunction(obj: any): obj is Function {
    return typeof obj === 'function';
}

export const emptyArray: [] = [];
