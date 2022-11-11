import { WeakSetProtoHas } from '../../dist/index.mjs.js';

describe('WeakSet', () => {
    it('WeakSetProtoHas', () => {
        expect(WeakSetProtoHas).toBe(WeakSet.prototype.has);
    });
});
