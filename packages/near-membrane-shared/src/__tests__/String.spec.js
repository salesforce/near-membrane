import { StringCtor, StringProtoSlice, StringProtoValueOf } from '../../dist/index.mjs.js';

describe('String', () => {
    it('StringCtor', () => {
        expect(StringCtor).toBe(String);
    });
    it('StringProtoSlice', () => {
        expect(StringProtoSlice).toBe(String.prototype.slice);
    });
    it('StringProtoValueOf', () => {
        expect(StringProtoValueOf).toBe(String.prototype.valueOf);
    });
});
