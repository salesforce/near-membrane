import {
    LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL,
    LOCKER_NEAR_MEMBRANE_SYMBOL,
} from './constants';
import type { NearMembraneSerializedValue } from './types';

export function getNearMembraneSerializedValue(object: object): NearMembraneSerializedValue {
    return LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL in object
        ? undefined
        : (object as any)[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL];
}

export function isNearMembrane(value: any): boolean {
    if ((typeof value === 'object' && value !== null) || typeof value === 'function') {
        return (
            !(LOCKER_NEAR_MEMBRANE_SYMBOL in value) &&
            (value as any)[LOCKER_NEAR_MEMBRANE_SYMBOL] === true
        );
    }
    return false;
}
