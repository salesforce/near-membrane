import { StringCtor, StringProtoSlice } from '../../dist/index';

describe('String', () => {
    it('StringCtor', () => {
        expect(StringCtor).toBe(String);
    });
    it('StringProtoSlice', () => {
        expect(StringProtoSlice).toBe(String.prototype.slice);
    });
});
