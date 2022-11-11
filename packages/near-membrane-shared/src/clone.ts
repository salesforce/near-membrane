import { ArrayCtor, ArrayProtoShift } from './Array';
import { getBrand } from './basic';
import {
    TO_STRING_BRAND_ARRAY,
    TO_STRING_BRAND_BIG_INT,
    TO_STRING_BRAND_BOOLEAN,
    TO_STRING_BRAND_MAP,
    TO_STRING_BRAND_NUMBER,
    TO_STRING_BRAND_OBJECT,
    TO_STRING_BRAND_REG_EXP,
    TO_STRING_BRAND_SET,
    TO_STRING_BRAND_STRING,
} from './constants';
import { JSONParse } from './JSON';
import { MapCtor, MapProtoEntries, MapProtoSet, toSafeMap } from './Map';
import { getNearMembraneSerializedValue, isNearMembrane } from './NearMembrane';
import { ObjectCtor, ObjectKeys, ObjectProto } from './Object';
import { ReflectApply, ReflectGetPrototypeOf } from './Reflect';
import { RegExpCtor } from './RegExp';
import { SetCtor, SetProtoAdd, SetProtoValues } from './Set';

const SEEN_OBJECTS_MAP = toSafeMap(new MapCtor<object, object>());

function cloneBoxedPrimitive(object: object): object {
    return ObjectCtor(getNearMembraneSerializedValue(object));
}

function cloneMap(map: Map<any, any>, queue: any[]): Map<any, any> {
    // Section 2.7.3 StructuredSerializeInternal:
    // https://html.spec.whatwg.org/multipage/structured-data.html#structuredserializeinternal
    // Step 26.1.1: Let copiedList be a new empty List.
    const clone = new MapCtor();
    // Step 26.1.2: For each Record { [[Key]], [[Value]] } entry of value.[[MapData]]...
    const entriesIterable = ReflectApply(MapProtoEntries, map, []);
    // Step 26.1.3 For each Record { [[Key]], [[Value]] } entry of copiedList:
    let { length: queueOffset } = queue;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const { done, value: subKeyValuePair } = entriesIterable.next();
        if (done) {
            break;
        }
        const { 0: subKey, 1: subValue } = subKeyValuePair;
        let subCloneKey: any;
        // Step 26.1.3.1: Let serializedKey be ? StructuredSerializeInternal(entry.[[Key]], forStorage, memory).
        queue[queueOffset++] = [
            (subClone: any) => {
                subCloneKey = subClone;
            },
            subKey,
        ];
        // Step 26.1.3.2: Let serializedValue be ? StructuredSerializeInternal(entry.[[Value]], forStorage, memory).
        queue[queueOffset++] = [
            (subCloneValue: any) => {
                ReflectApply(MapProtoSet, clone, [subCloneKey, subCloneValue]);
            },
            subValue,
        ];
    }
    return clone;
}

function cloneRegExp(regexp: RegExp): RegExp {
    const { flags, source } = JSONParse(getNearMembraneSerializedValue(regexp) as string);
    return new RegExpCtor(source, flags);
}

function cloneSet(set: Set<any>, queue: any[]): Set<any> {
    // Section 2.7.3 StructuredSerializeInternal:
    // https://html.spec.whatwg.org/multipage/structured-data.html#structuredserializeinternal
    // Step 26.2.1: Let copiedList be a new empty List.
    const clone = new SetCtor();
    // Step 26.2.2: For each entry of value.[[SetData]]...
    const valuesIterable = ReflectApply(SetProtoValues, set, []);
    // Step 26.2.3: For each entry of copiedList:
    let { length: queueOffset } = queue;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const { done, value: subValue } = valuesIterable.next();
        if (done) {
            break;
        }
        // Step 26.2.3.1: Let serializedEntry be ? StructuredSerializeInternal(entry, forStorage, memory).
        queue[queueOffset++] = [
            (subCloneValue: any) => {
                ReflectApply(SetProtoAdd, clone, [subCloneValue]);
            },
            subValue,
        ];
    }
    return clone;
}

function enqueue(queue: any[], originalValue: object, cloneValue: object) {
    // Section 2.7.3 StructuredSerializeInternal:
    // https://html.spec.whatwg.org/multipage/structured-data.html#structuredserializeinternal
    // Step 26.4: Otherwise, for each key in ! EnumerableOwnPropertyNames(value, key)...
    // Note: Object.keys() performs EnumerableOwnPropertyNames() internally as
    // defined in ECMA262:
    // https://tc39.es/ecma262/#sec-object.keys
    const keys = ObjectKeys(originalValue);
    let { length: queueOffset } = queue;
    for (let i = 0, { length } = keys; i < length; i += 1) {
        // Step 26.4.1.1: Let inputValue be ? value.[[Get]](key, value).
        // The [[Get]] operation is defined in ECMA262 for ordinary objects,
        // argument objects, integer-indexed exotic objects, module namespace
        // objects, and proxy objects.
        // https://tc39.es/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots-get-p-receiver
        const key = keys[i];
        const subValue = (originalValue as any)[key];
        queue[queueOffset++] = [
            (subCloneValue: object) => {
                // Step 26.4.1.3: Property descriptor attributes are not
                // preserved during deserialization because only keys and
                // values are captured in serialized.[[Properties]].
                (cloneValue as any)[key] = subCloneValue;
            },
            subValue,
        ];
    }
}

// This function is the unguarded internal variant of `partialStructuredClone()`.
// Any error thrown that is captured by `partialStructuredClone()` is treated as
// a `DataCloneError`. This function clones blue membrane proxied arrays, plain
// objects, maps, regexps, sets, and boxed primitives. The following non-membrane
// proxied objects are set by reference instead of cloning:
//   ArrayBuffer
//   BigInt64Array
//   BigUint64Array
//   Blob
//   DataView
//   Date
//   DOMException
//   DOMMatrix
//   DOMMatrixReadOnly
//   DOMPoint
//   DOMPointReadOnly
//   DOMQuad
//   DOMRect
//   DOMRectReadOnly
//   Error
//   EvalError
//   File
//   FileList
//   Float32Array
//   Float64Array
//   ImageBitMap
//   ImageData
//   Int8Array
//   Int16Array
//   Int32Array
//   RangeError
//   ReferenceError
//   SyntaxError
//   TypeError
//   Uint8Array
//   Uint8ClampedArray
//   Uint16Array
//   Uint32Array
//   URIError
//
// Note:
// This function performs brand checks using `Object.prototype.toString`. The
// results can be faked with `Symbol.toStringTag` property values and are a poor
// substitute for native internal slot checks. However, for our purposes they
// are perfectly fine and avoid having to repeatedly walk the prototype of proxied
// values. Cloned values should be passed to native methods, like `postMessage()`,
// which perform their own validation with internal slot checks.
function partialStructuredCloneInternal(value: any): any {
    // Using a queue instead of recursive function calls avoids call stack limits
    // and enables cloning more complex and deeply nested objects.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Too_much_recursion
    let result: any;
    const queue = [
        [
            (subClone: any) => {
                result = subClone;
            },
            value,
        ],
    ];
    // eslint-disable-next-line no-labels
    queueLoop: while (queue.length) {
        // Section 2.7.3 StructuredSerializeInternal:
        // https://html.spec.whatwg.org/multipage/structured-data.html#structuredserializeinternal
        // prettier-ignore
        const {
            0: setter,
            1: originalValue,
        } = ReflectApply(ArrayProtoShift, queue, []);
        // Step 4: If Type(value) is Undefined, Null, Boolean, Number, BigInt, or String
        if (
            originalValue === null ||
            originalValue === undefined ||
            typeof originalValue === 'boolean' ||
            typeof originalValue === 'number' ||
            typeof originalValue === 'string' ||
            typeof originalValue === 'bigint'
        ) {
            setter(originalValue);
            // eslint-disable-next-line no-continue, no-extra-label, no-labels
            continue queueLoop;
        }
        // Step 5: If Type(value) is Symbol, then throw a 'DataCloneError' DOMException.
        if (typeof originalValue === 'symbol') {
            // Stop cloning and set the original value and defer throwing to
            // native methods.
            setter(originalValue);
            // eslint-disable-next-line no-extra-label, no-labels
            break queueLoop;
        }
        // To support circular references check if the original value has been
        // seen. If it has then use the clone associated with its record instead
        // of creating a new clone.
        let cloneValue = SEEN_OBJECTS_MAP.get(originalValue);
        if (cloneValue) {
            setter(cloneValue);
            // eslint-disable-next-line no-continue, no-extra-label, no-labels
            continue queueLoop;
        }
        // Perform a brand check on originalValue.
        const brand = getBrand(originalValue);
        // eslint-disable-next-line default-case
        switch (brand) {
            // Step 19: Otherwise, if value is a platform object...
            case TO_STRING_BRAND_OBJECT: {
                const proto = ReflectGetPrototypeOf(originalValue);
                if (
                    proto === ObjectProto ||
                    proto === null ||
                    // Possible `Object.prototype` from another document.
                    ReflectGetPrototypeOf(proto) === null
                ) {
                    cloneValue = {};
                    // Step 19.4: Set deep to true.
                    enqueue(queue, originalValue, cloneValue);
                }
                break;
            }
            // Step 18: Otherwise, if value is an Array exotic object...
            case TO_STRING_BRAND_ARRAY:
                // Step 18.1 Let valueLenDescriptor be ? OrdinaryGetOwnProperty(value, 'length').
                // Note: Rather than perform the more complex OrdinaryGetOwnProperty()
                // operation for 'length' because it is a non-configurable property
                // we can access it with the simpler [[Get]]() operation defined
                // in ECMA262.
                // https://tc39.es/ecma262/#sec-integer-indexed-exotic-objects-get-p-receiver
                cloneValue = ArrayCtor(originalValue.length);
                // Step 18.4: Set deep to true.
                enqueue(queue, originalValue, cloneValue);
                break;
            // Step 15: Otherwise, if value has [[MapData]] internal slot...
            // Step 15.2: Set deep to true.
            case TO_STRING_BRAND_MAP:
                cloneValue = cloneMap(originalValue, queue);
                break;
            // Step 16: Otherwise, if value has [[SetData]] internal slot...
            // Step 16.2: Set deep to true.
            case TO_STRING_BRAND_SET:
                cloneValue = cloneSet(originalValue, queue);
                break;
        }
        if (cloneValue === undefined) {
            // istanbul ignore else
            if (!isNearMembrane(originalValue)) {
                // Skip cloning non-membrane proxied objects.
                SEEN_OBJECTS_MAP.set(originalValue, originalValue);
                setter(originalValue);
                // eslint-disable-next-line no-extra-label, no-labels
                continue queueLoop;
            }
            // Cases ordered by a guestimate on frequency of encounter.
            // eslint-disable-next-line default-case
            switch (brand) {
                // Step 12: Otherwise, if value has a [[RegExpMatcher]] internal slot...
                case TO_STRING_BRAND_REG_EXP:
                    cloneValue = cloneRegExp(originalValue);
                    break;
                // Step 7: If value has a [[BooleanData]] internal slot...
                case TO_STRING_BRAND_BOOLEAN:
                // Step 8: Otherwise, if value has a [[NumberData]] internal slot...
                // eslint-disable-next-line no-fallthrough
                case TO_STRING_BRAND_NUMBER:
                // Step 9: Otherwise, if value has a [[BigIntData]] internal slot...
                // eslint-disable-next-line no-fallthrough
                case TO_STRING_BRAND_BIG_INT:
                // Step 10: Otherwise, if value has a [[StringData]] internal slot...
                // eslint-disable-next-line no-fallthrough
                case TO_STRING_BRAND_STRING:
                    cloneValue = cloneBoxedPrimitive(originalValue);
                    break;
            }
        }
        // Step 21: Otherwise, if IsCallable(value) is true, then throw a 'DataCloneError'
        // Step 20: Otherwise, if value is a platform object, then throw a 'DataCloneError'
        if (cloneValue === undefined) {
            // Stop cloning and set the original value and defer throwing to
            // native methods.
            setter(originalValue);
            // eslint-disable-next-line no-extra-label, no-labels
            break queueLoop;
        }
        SEEN_OBJECTS_MAP.set(originalValue, cloneValue);
        setter(cloneValue);
    }
    return result;
}

export function partialStructuredClone(value: any): any {
    let result = value;
    try {
        result = partialStructuredCloneInternal(value);
        // eslint-disable-next-line no-empty
    } catch {}
    SEEN_OBJECTS_MAP.clear();
    return result;
}
