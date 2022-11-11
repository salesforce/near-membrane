import { BooleanProtoValueOf } from '../../dist/index.mjs.js';

describe('Boolean', () => {
    it('BooleanProtoValueOf', () => {
        expect(BooleanProtoValueOf).toBe(Boolean.prototype.valueOf);
    });
});
