import { isProxyMaskedFunction } from '@locker/near-membrane-shared';
import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('Date', () => {
    it('Date.prototype.toJSON is masked', () => {
        expect.assertions(2);

        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });
        env.evaluate(`
            expect(Date.prototype.toJSON.toString()).toContain('[native code]');
        `);
        expect(isProxyMaskedFunction(Date.prototype.toJSON)).toBe(false);
    });

    it('Date.prototype.toJSON does not support proxy masked symbol handshake', () => {
        expect.assertions(1);

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
            ).toBe(false);
        `);
    });
});
