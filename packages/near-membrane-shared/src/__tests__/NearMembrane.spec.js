import { getNearMembraneSerializedValue, isNearMembrane } from '../../dist/index.mjs.js';

const LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL = Symbol.for(
    '@@lockerNearMembraneSerializedValue'
);

describe('NearMembrane', () => {
    it('getNearMembraneSerializedValue', () => {
        // In the red realm this should return `undefined`.
        expect(getNearMembraneSerializedValue(/a/)).toBe(undefined);
        expect(
            getNearMembraneSerializedValue({
                [LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL]: true,
            })
        ).toBe(undefined);
    });
    it('isNearMembrane', () => {
        // In the red realm this should return `false`.
        expect(isNearMembrane({})).toBe(false);
        expect(isNearMembrane(null)).toBe(false);
    });
});
