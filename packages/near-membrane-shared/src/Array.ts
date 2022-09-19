import { ObjectAssign, ObjectFreeze } from './Object';
import { ReflectSetPrototypeOf } from './Reflect';
import { SymbolIterator, SymbolUnscopables } from './Symbol';

export const ArrayCtor = Array;

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
    [SymbolIterator as any]: ArrayProtoSymbolIterator,
} = ArrayProto;

const ArrayUnscopables = ObjectFreeze(
    ObjectAssign({ __proto__: null }, ArrayProto[SymbolUnscopables as any])
);

export const { push: ArrayProtoPush } = ArrayProto;

export const { isArray: ArrayIsArray } = ArrayCtor;

export function toSafeArray<T extends any[]>(array: T): T {
    ReflectSetPrototypeOf(array, null);
    array.at = ArrayProtoAt;
    array.concat = ArrayProtoConcat;
    // *** DO NOT SET THE ARRAY CONSTRUCTOR PROPERTY ***
    // https://bugs.chromium.org/p/v8/issues/detail?id=13202
    // https://source.chromium.org/chromium/chromium/src/+/main:v8/src/objects/lookup.cc;l=196-215?q=IsArraySpeciesLookupChainIntact
    //
    // In V8 setting the constructor property of an array, promise, regexp, or
    // typed array triggers a de-opt because it could change an instance's
    // @@species. This de-opt affects at least `Array#splice` and occurs even
    // if the prototype of the array is change or nulled beforehand. Further,
    // the de-opt persists after a page refresh. It is not until navigating to
    // a different page that the performance of `Array#splice` is restored.
    array.copyWithin = ArrayProtoCopyWithin as any;
    array.entries = ArrayProtoEntries;
    array.every = ArrayProtoEvery;
    array.fill = ArrayProtoFill as any;
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
    array.sort = ArrayProtoSort as any;
    array.splice = ArrayProtoSplice;
    array.toLocaleString = ArrayProtoToLocaleString;
    array.toString = ArrayProtoToString;
    array.unshift = ArrayProtoUnshift;
    array.values = ArrayProtoValues;
    array[SymbolIterator as any] = ArrayProtoSymbolIterator;
    array[SymbolUnscopables as any] = ArrayUnscopables;
    ReflectSetPrototypeOf(array, ArrayProto);
    return array;
}
