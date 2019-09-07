const { isArray } = Array;

const {
    getPrototypeOf,
    setPrototypeOf,
    create: ObjectCreate,
    defineProperty: ObjectDefineProperty,
    defineProperties: ObjectDefineProperties,
    isExtensible,
    getOwnPropertyDescriptor,
    getOwnPropertyDescriptors,
    getOwnPropertyNames,
    getOwnPropertySymbols,
    preventExtensions,
    hasOwnProperty,
    freeze,
} = Object;

const {
    push: ArrayPush,
    concat: ArrayConcat,
    map: ArrayMap,
} = Array.prototype;

export {
    ArrayPush,
    ArrayConcat,
    ArrayMap,
    isArray,
    getPrototypeOf,
    setPrototypeOf,
    ObjectCreate,
    ObjectDefineProperty,
    ObjectDefineProperties,
    isExtensible,
    getOwnPropertyDescriptor,
    getOwnPropertyDescriptors,
    getOwnPropertyNames,
    getOwnPropertySymbols,
    preventExtensions,
    hasOwnProperty,
    freeze,
};

const OtS = {}.toString;
export function toString(obj: any): string {
    if (obj && obj.toString) {
        return obj.toString();
    } else if (typeof obj === 'object') {
        return OtS.call(obj);
    } else {
        return obj + '';
    }
}

export function isUndefined(obj: any): obj is undefined {
    return obj === undefined;
}

export function isNull(obj: any): obj is null {
    return obj === null;
}

export function isTrue(obj: any): obj is true {
    return obj === true;
}

export function isFalse(obj: any): obj is false {
    return obj === false;
}

export function isFunction(obj: any): obj is Function {
    return typeof obj === 'function';
}

export function isObject(obj: any): obj is object {
    return typeof obj === 'object';
}

export function getPropertyDescriptor(o: any, p: PropertyKey): PropertyDescriptor | undefined {
    do {
        const d = getOwnPropertyDescriptor(o, p);
        if (!isUndefined(d)) {
            return d;
        }
        o = getPrototypeOf(o);
    } while (o !== null);
    return undefined;
}
