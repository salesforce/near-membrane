import { RegExpProtoTest } from '../../dist/index.mjs.js';

describe('RegExp', () => {
    it('RegExpProtoTest', () => {
        expect(RegExpProtoTest).toBe(RegExp.prototype.test);
    });
});
