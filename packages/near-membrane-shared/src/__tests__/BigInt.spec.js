import { BigIntProtoValueOf, SUPPORTS_BIG_INT } from '../../dist/index.mjs.js';

describe('BigInt', () => {
    it('BigIntProtoValueOf', () => {
        expect(BigIntProtoValueOf).toBe(BigInt.prototype.valueOf);
    });
    it('SUPPORTS_BIG_INT', () => {
        expect(typeof SUPPORTS_BIG_INT).toBe('boolean');
    });
});
