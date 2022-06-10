const ArrayCtor = Array;
const WeakMapCtor = WeakMap;

const { setPrototypeOf: ReflectSetPrototypeOf } = Reflect;

const {
    iterator: SymbolIterator,
    toStringTag: SymbolToStringTag,
    unscopables: SymbolUnscopables,
} = Symbol;

const { prototype: ArrayProto } = ArrayCtor;

const {
    at: ArrayProtoAt,
    concat: ArrayProtoConcat,
    copyWithin: ArrayProtoCopyWithin,
    entries: ArrayProtoEntries,
    every: ArrayProtoEvery,
    fill: ArrayProtoFill,
    filter: ArrayProtoFilter,
    find: ArrayProtoFind,
    findIndex: ArrayProtoFindIndex,
    flat: ArrayProtoFlat,
    flatMap: ArrayProtoFlatMap,
    forEach: ArrayProtoForEach,
    includes: ArrayProtoIncludes,
    indexOf: ArrayProtoIndexOf,
    join: ArrayProtoJoin,
    keys: ArrayProtoKeys,
    lastIndexOf: ArrayProtoLastIndexOf,
    map: ArrayProtoMap,
    pop: ArrayProtoPop,
    push: ArrayProtoPush,
    reduce: ArrayProtoReduce,
    reduceRight: ArrayProtoReduceRight,
    reverse: ArrayProtoReverse,
    shift: ArrayProtoShift,
    slice: ArrayProtoSlice,
    some: ArrayProtoSome,
    sort: ArrayProtoSort,
    splice: ArrayProtoSplice,
    toLocaleString: ArrayProtoToLocaleString,
    toString: ArrayProtoToString,
    unshift: ArrayProtoUnshift,
    values: ArrayProtoValues,
    [SymbolIterator]: ArrayProtoSymbolIterator,
} = ArrayProto as any;

const ArrayUnscopables = Object.freeze(
    Object.assign({ __proto__: null }, ArrayProto[SymbolUnscopables])
);

const { prototype: WeakMapProto } = WeakMapCtor;

const {
    delete: WeakMapProtoDelete,
    get: WeakMapProtoGet,
    has: WeakMapProtoHas,
    set: WeakMapProtoSet,
    [SymbolToStringTag]: WeakMapProtoSymbolToStringTag,
} = WeakMapProto as any;

export function toSafeArray<T extends any[]>(array: T): T {
    ReflectSetPrototypeOf(array, null);
    array.at = ArrayProtoAt;
    array.concat = ArrayProtoConcat;
    array.constructor = ArrayCtor;
    array.copyWithin = ArrayProtoCopyWithin;
    array.entries = ArrayProtoEntries;
    array.every = ArrayProtoEvery;
    array.fill = ArrayProtoFill;
    array.filter = ArrayProtoFilter;
    array.find = ArrayProtoFind;
    array.findIndex = ArrayProtoFindIndex;
    array.flat = ArrayProtoFlat;
    array.flatMap = ArrayProtoFlatMap;
    array.forEach = ArrayProtoForEach;
    array.includes = ArrayProtoIncludes;
    array.indexOf = ArrayProtoIndexOf;
    array.join = ArrayProtoJoin;
    array.keys = ArrayProtoKeys;
    array.lastIndexOf = ArrayProtoLastIndexOf;
    array.map = ArrayProtoMap;
    array.pop = ArrayProtoPop;
    array.push = ArrayProtoPush;
    array.reduce = ArrayProtoReduce;
    array.reduceRight = ArrayProtoReduceRight;
    array.reverse = ArrayProtoReverse;
    array.shift = ArrayProtoShift;
    array.slice = ArrayProtoSlice;
    array.some = ArrayProtoSome;
    array.sort = ArrayProtoSort;
    array.splice = ArrayProtoSplice;
    array.toLocaleString = ArrayProtoToLocaleString;
    array.toString = ArrayProtoToString;
    array.unshift = ArrayProtoUnshift;
    array.values = ArrayProtoValues;
    array[SymbolIterator] = ArrayProtoSymbolIterator;
    array[SymbolUnscopables] = ArrayUnscopables;
    ReflectSetPrototypeOf(array, ArrayProto);
    return array;
}

export function toSafeWeakMap<T extends WeakMap<any, any>>(weakMap: T): T {
    ReflectSetPrototypeOf(weakMap, null);
    weakMap.constructor = WeakMapCtor;
    weakMap.delete = WeakMapProtoDelete;
    weakMap.get = WeakMapProtoGet;
    weakMap.has = WeakMapProtoHas;
    weakMap.set = WeakMapProtoSet;
    weakMap[SymbolToStringTag] = WeakMapProtoSymbolToStringTag;
    ReflectSetPrototypeOf(weakMap, WeakMapProto);
    return weakMap;
}