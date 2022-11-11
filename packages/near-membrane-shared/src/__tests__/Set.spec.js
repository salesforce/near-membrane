import { SetCtor, SetProtoAdd, SetProtoValues } from '../../dist/index.mjs.js';

describe('Set', () => {
    it('SetCtor', () => {
        expect(SetCtor).toBe(Set);
    });
    it('SetProtoAdd', () => {
        expect(SetProtoAdd).toBe(Set.prototype.add);
    });
    it('SetProtoValues', () => {
        expect(SetProtoValues).toBe(Set.prototype.values);
    });
});
