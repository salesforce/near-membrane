import { isNearMembraneProxyMaskedFunction } from '@locker/near-membrane-shared';
import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('Date', () => {
    it('Date.prototype.toJSON is masked', () => {
        expect.assertions(2);

        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });
        env.evaluate(`
            const LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL = Symbol.for(
                '@@lockerNearMembraneProxyMasked'
            );
            const {
                prototype: { toJSON: DateProtoToJSON },
            } = Date;
            expect(
                !(LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL in DateProtoToJSON) &&
                DateProtoToJSON[LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL] === true
            ).toBe(true);
        `);
        expect(isNearMembraneProxyMaskedFunction(Date.prototype.toJSON)).toBe(false);
    });
});
