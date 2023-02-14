import {
    getNearMembraneProxySerializedValue,
    isNearMembraneProxy,
    isNearMembraneProxyMaskedFunction,
    LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL,
    LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL,
    LOCKER_NEAR_MEMBRANE_SYMBOL,
    proxyMaskFunction,
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

    it('isNearMembraneProxyMaskedFunction', () => {
        expect(isNearMembraneProxyMaskedFunction({})).toBe(false);
        expect(isNearMembraneProxyMaskedFunction(null)).toBe(false);
        expect(isNearMembraneProxyMaskedFunction(undefined)).toBe(false);
        const func = () => 'func';
        func[LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL] = true;
        expect(isNearMembraneProxyMaskedFunction(func)).toBe(false);
        const mask = () => 'mask';
        expect(isNearMembraneProxyMaskedFunction(mask)).toBe(false);
        const masked = proxyMaskFunction(func, mask);
        expect(isNearMembraneProxyMaskedFunction(masked)).toBe(true);
    });
});
