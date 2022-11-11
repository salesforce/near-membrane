import { RegExpCtor, RegExpProtoSourceGetter, RegExpProtoTest } from '../../dist/index.mjs.js';

describe('RegExp', () => {
    it('RegExpCtor', () => {
        expect(RegExpCtor).toBe(RegExp);
    });
    it('RegExpProtoSourceGetter', () => {
        expect(RegExpProtoSourceGetter).toBe(
            Reflect.getOwnPropertyDescriptor(RegExp.prototype, 'source').get
        );
    });
    it('RegExpProtoTest', () => {
        expect(RegExpProtoTest).toBe(RegExp.prototype.test);
    });
});
