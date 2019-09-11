const {
    getPrototypeOf,
    setPrototypeOf,
    create: ObjectCreate,
    defineProperty: ObjectDefineProperty,
    isExtensible,
    getOwnPropertyDescriptor,
    getOwnPropertyDescriptors,
    getOwnPropertyNames,
    getOwnPropertySymbols,
    preventExtensions,
    hasOwnProperty,
    freeze,
} = Object;

export {
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

export function isUndefined(obj: any): obj is undefined {
    return obj === undefined;
}

export function isTrue(obj: any): obj is true {
    return obj === true;
}

export function isFunction(obj: any): obj is Function {
    return typeof obj === 'function';
}
