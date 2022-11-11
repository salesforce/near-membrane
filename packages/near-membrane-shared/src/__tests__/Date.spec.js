import { DateProtoValueOf } from '../../dist/index.mjs.js';

describe('Date', () => {
    it('DateProtoValueOf', () => {
        expect(DateProtoValueOf).toBe(Date.prototype.valueOf);
    });
});
