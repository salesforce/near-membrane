import {
    LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL,
    LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL,
    LOCKER_NEAR_MEMBRANE_SYMBOL,
} from './constants';
import type { NearMembraneSerializedValue } from './types';

export function getNearMembraneProxySerializedValue(object: object): NearMembraneSerializedValue {
    if ((typeof object === 'object' && object !== null) || typeof object === 'function') {
        // To extract the serialized value of a blue near-membrane proxy we must
        // perform a two step handshake. First, we trigger the "has" trap for
        // the `LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL` property which
        // must report `false`. Second, we trigger the "get" trap to return the
        // serialized value.
        return LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL in object
            ? undefined
            : (object as any)[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL];
    }
    return undefined;
}

export function isNearMembraneProxy(value: any): boolean {
    if ((typeof value === 'object' && value !== null) || typeof value === 'function') {
        // To extract the flag value of a blue near-membrane proxy we must
        // perform a two step handshake. First, we trigger the "has" trap for
        // the `LOCKER_NEAR_MEMBRANE_SYMBOL` property which must report `false`.
        // Second, we trigger the "get" trap to return the flag value.
        return (
            !(LOCKER_NEAR_MEMBRANE_SYMBOL in value) &&
            (value as any)[LOCKER_NEAR_MEMBRANE_SYMBOL] === true
        );
    }
    return false;
}

export function isNearMembraneProxyMaskedFunction(value: any): boolean {
    // To extract the flag value of a blue near-membrane proxy we must perform
    // a two step handshake. First, we trigger the "has" trap for the
    // `LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL` property which must report
    // `false`. Second, we trigger the "get" trap to return the flag value.
    return (
        typeof value === 'function' &&
        !(LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL in value) &&
        (value as any)[LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL] === true
    );
}
