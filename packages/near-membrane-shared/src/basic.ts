import { ArrayIsArray } from './Array';
import { ArrayBufferProtoByteLengthGetter } from './ArrayBuffer';
import { BigIntProtoValueOf, SUPPORTS_BIG_INT } from './BigInt';
import { BooleanProtoValueOf } from './Boolean';
import {
    TO_STRING_BRAND_ARRAY,
    TO_STRING_BRAND_ARRAY_BUFFER,
    TO_STRING_BRAND_BIG_INT,
    TO_STRING_BRAND_BOOLEAN,
    TO_STRING_BRAND_DATE,
    TO_STRING_BRAND_FUNCTION,
    TO_STRING_BRAND_MAP,
    TO_STRING_BRAND_NULL,
    TO_STRING_BRAND_NUMBER,
    TO_STRING_BRAND_OBJECT,
    TO_STRING_BRAND_REG_EXP,
    TO_STRING_BRAND_SET,
    TO_STRING_BRAND_STRING,
    TO_STRING_BRAND_SYMBOL,
    TO_STRING_BRAND_UNDEFINED,
    TO_STRING_BRAND_WEAK_MAP,
    TO_STRING_BRAND_WEAK_SET,
} from './constants';
import { DateProtoValueOf } from './Date';
import { MapProtoSizeGetter } from './Map';
import { NumberProtoValueOf } from './Number';
import { ObjectHasOwn, ObjectProtoToString } from './Object';
import { ReflectApply } from './Reflect';
import { RegExpProtoSourceGetter } from './RegExp';
import { SetProtoSizeGetter } from './Set';
import { StringProtoValueOf } from './String';
import { SymbolProtoValueOf } from './Symbol';
import { WeakMapProtoHas } from './WeakMap';
import { WeakSetProtoHas } from './WeakSet';

const { toStringTag: TO_STRING_TAG_SYMBOL } = Symbol;

function getBrandByTrialAndError(value: any): string {
    // Trail and error attempts are performed in order of most likely,
    // e.g. those values that have a @@toStringTag defined by default,
    // to least likely.
    //
    // Internally these brand checks rely on native methods that throw and catch
    // an exception when they operate on values with unexpected internal slot
    // entries.

    // Section 25.1.5.1 get ArrayBuffer.prototype.byteLength
    // https://tc39.es/ecma262/#sec-get-arraybuffer.prototype.bytelength
    // Step 2: Perform RequireInternalSlot(O, [[ArrayBufferData]]).
    try {
        if ('byteLength' in value) {
            ReflectApply(ArrayBufferProtoByteLengthGetter, value, []);
            return TO_STRING_BRAND_ARRAY_BUFFER;
        }
        // eslint-disable-next-line no-empty
    } catch {}
    // Section 21.4.4 Properties of the Date Prototype Object
    // https://tc39.es/ecma262/#thistimevalue
    // Step 1: If Type(value) is Object and value has a [[DateValue]] internal slot, then
    //     a. Return value.[[DateValue]].
    // Step 2: Throw a TypeError exception.
    try {
        if ('toLocaleDateString' in value) {
            ReflectApply(DateProtoValueOf, value, []);
            return TO_STRING_BRAND_DATE;
        }
        // eslint-disable-next-line no-empty
    } catch {}
    // Section 24.1.3.10 get Map.prototype.size
    // https://tc39.es/ecma262/#sec-get-map.prototype.size
    // Step 2: Perform ? RequireInternalSlot(M, [[MapData]]).
    try {
        if ('get' in value && 'size' in value) {
            ReflectApply(MapProtoSizeGetter, value, []);
            return TO_STRING_BRAND_MAP;
        }
        // eslint-disable-next-line no-empty
    } catch {}
    // Section 24.2.3.9 get Set.prototype.size
    // https://tc39.es/ecma262/#sec-get-set.prototype.size
    // Step 2: Perform ? RequireInternalSlot(S, [[SetData]]).
    try {
        if ('add' in value && 'size' in value) {
            ReflectApply(SetProtoSizeGetter, value, []);
            return TO_STRING_BRAND_SET;
        }
        // eslint-disable-next-line no-empty
    } catch {}
    // Section 24.3.3.4 WeakMap.prototype.has ( key )
    // https://tc39.es/ecma262/#sec-weakmap.prototype.has
    // Step 2: Perform RequireInternalSlot(M, [[WeakMapData]]).
    try {
        if ('get' in value && !('size' in value)) {
            ReflectApply(WeakMapProtoHas, value, []);
            return TO_STRING_BRAND_WEAK_MAP;
        }
        // eslint-disable-next-line no-empty
    } catch {}
    // Section 24.4.3.4 WeakSet.prototype.has ( value )
    // https://tc39.es/ecma262/#sec-weakset.prototype.has
    // Step 2: 2. Perform RequireInternalSlot(S, [[WeakSetData]]).
    try {
        if ('add' in value && !('size' in value)) {
            ReflectApply(WeakSetProtoHas, value, []);
            return TO_STRING_BRAND_WEAK_SET;
        }
        // eslint-disable-next-line no-empty
    } catch {}

    // The following checks are for the rare occurrence of object, i.e. boxed,
    // primitive values or those objects without a default @@toStringTag.

    // Section 21.1.3 Properties of the Number Prototype Object
    // https://tc39.es/ecma262/#thisnumbervalue
    // Step 2: If Type(value) is Object and value has a [[NumberData]] internal slot, then
    //     a. Let n be value.[[NumberData]].
    //     b. Assert: Type(n) is Number.
    try {
        if ('toPrecision' in value) {
            ReflectApply(NumberProtoValueOf, value, []);
            return TO_STRING_BRAND_NUMBER;
        }
        // eslint-disable-next-line no-empty
    } catch {}
    // Section 20.4.3 Properties of the Symbol Prototype Object
    // https://tc39.es/ecma262/#thissymbolvalue
    // Step 2: If Type(value) is Object and value has a [[SymbolData]] internal slot, then
    //     a. Let s be value.[[SymbolData]].
    //     b. Assert: Type(s) is Symbol.
    try {
        if ('description' in value) {
            ReflectApply(SymbolProtoValueOf, value, []);
            return TO_STRING_BRAND_SYMBOL;
        }
        // eslint-disable-next-line no-empty
    } catch {}

    // Perform heavier checks last.

    // Section 22.2.6.13 get RegExp.prototype.source
    // https://tc39.es/ecma262/#sec-get-regexp.prototype.source
    // Step 3: If R does not have an [[OriginalSource]] internal slot, then
    //     a. If SameValue(R, %RegExp.prototype%) is true, return "(?:)".
    //     b. Otherwise, throw a TypeError exception.
    try {
        if (ObjectHasOwn(value, 'lastIndex')) {
            ReflectApply(RegExpProtoSourceGetter, value, []);
            return TO_STRING_BRAND_REG_EXP;
        }
        // eslint-disable-next-line no-empty
    } catch {}
    // Section 22.1.3 Properties of the String Prototype Object
    // https://tc39.es/ecma262/#thisstringvalue
    // Step 2: If Type(value) is Object and value has a [[StringData]] internal slot, then
    //     a. Let s be value.[[StringData]].
    //     b. Assert: Type(s) is String.
    try {
        if (ObjectHasOwn(value, 'length')) {
            ReflectApply(StringProtoValueOf, value, []);
            return TO_STRING_BRAND_STRING;
        }
        // eslint-disable-next-line no-empty
    } catch {}
    // Section 20.3.3 Properties of the Boolean Prototype Object
    // https://tc39.es/ecma262/#thisbooleanvalue
    // Step 2: If Type(value) is Object and value has a [[BooleanData]] internal slot, then
    //     a. Let b be value.[[BooleanData]].
    //     b. Assert: Type(b) is Boolean.
    try {
        ReflectApply(BooleanProtoValueOf, value, []);
        return TO_STRING_BRAND_BOOLEAN;
        // eslint-disable-next-line no-empty
    } catch {}
    // istanbul ignore else: All platforms that LWS runs tests in support BigInt
    if (SUPPORTS_BIG_INT) {
        try {
            // Section 21.2.3 Properties of the BigInt Prototype Object
            // https://tc39.es/ecma262/#thisbigintvalue
            // Step 2: If Type(value) is Object and value has a [[BigIntData]] internal slot, then
            //     a. Assert: Type(value.[[BigIntData]]) is BigInt.
            ReflectApply(BigIntProtoValueOf!, value, []);
            return TO_STRING_BRAND_BIG_INT;
            // eslint-disable-next-line no-empty
        } catch {}
    }
    // Cannot detect brands for Arguments and Error objects.
    return TO_STRING_BRAND_OBJECT;
}

export function getBrand(value: any): string {
    // Section 20.1.3.6 Object.prototype.toString ( )
    // https://tc39.es/ecma262/#sec-object.prototype.tostring
    if (value === null) {
        return TO_STRING_BRAND_NULL;
    }
    if (value === undefined) {
        return TO_STRING_BRAND_UNDEFINED;
    }
    // eslint-disable-next-line default-case
    switch (typeof value) {
        case 'bigint':
            return TO_STRING_BRAND_BIG_INT;
        case 'boolean':
            return TO_STRING_BRAND_BOOLEAN;
        case 'function':
            return TO_STRING_BRAND_FUNCTION;
        case 'number':
            return TO_STRING_BRAND_NUMBER;
        case 'string':
            return TO_STRING_BRAND_STRING;
        case 'symbol':
            return TO_STRING_BRAND_SYMBOL;
    }
    if (ArrayIsArray(value)) {
        return TO_STRING_BRAND_ARRAY;
    }
    return TO_STRING_TAG_SYMBOL in value
        ? getBrandByTrialAndError(value)
        : ReflectApply(ObjectProtoToString, value, []);
}
