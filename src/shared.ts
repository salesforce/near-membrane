const {
    create: ObjectCreate,
    getOwnPropertyDescriptors,
    getOwnPropertyNames,
    getOwnPropertySymbols,
    freeze,
} = Object;

const {
    apply,
    construct,
    getPrototypeOf,
    setPrototypeOf,
    defineProperty: ObjectDefineProperty,
    isExtensible,
    getOwnPropertyDescriptor,
    preventExtensions,
} = Reflect;

const hasOwnProperty = unapply(Object.prototype.hasOwnProperty);

export {
    apply,
    construct,
    getPrototypeOf,
    setPrototypeOf,
    ObjectCreate,
    ObjectDefineProperty,
    isExtensible,
    getOwnPropertyDescriptor,
    getOwnPropertyDescriptors,
    getOwnPropertyNames,
    getOwnPropertySymbols,
    preventExtensions,
    hasOwnProperty,
    freeze,
};

export function unapply(func: Function): Function {
    return (thisArg: any, ...args: any[]) => apply(func, thisArg, args);
}

export function isUndefined(obj: any): obj is undefined {
    return obj === undefined;
}

export function isTrue(obj: any): obj is true {
    return obj === true;
}

export function isFunction(obj: any): obj is Function {
    return typeof obj === 'function';
}

export const emptyArray: [] = [];
