import {
    getNearMembraneProxySerializedValue,
    isNearMembraneProxy,
    LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL,
    LOCKER_NEAR_MEMBRANE_SYMBOL,
} from '../../dist/index.mjs.js';

describe('NearMembrane', () => {
    it('getNearMembraneProxySerializedValue', () => {
        expect(getNearMembraneProxySerializedValue(null)).toBe(undefined);
        expect(getNearMembraneProxySerializedValue(undefined)).toBe(undefined);
        expect(getNearMembraneProxySerializedValue(/a/)).toBe(undefined);
        expect(
            getNearMembraneProxySerializedValue({
                [LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL]: true,
            })
        ).toBe(undefined);
    });

    it('isNearMembraneProxy', () => {
        expect(isNearMembraneProxy({})).toBe(false);
        expect(isNearMembraneProxy(null)).toBe(false);
        expect(isNearMembraneProxy(undefined)).toBe(false);
        expect(
            isNearMembraneProxy({
                [LOCKER_NEAR_MEMBRANE_SYMBOL]: true,
            })
        ).toBe(false);
    });
});
