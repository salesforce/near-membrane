import { noop } from '../../dist/index.mjs.js';

describe('Function', () => {
    it('noop', () => {
        expect(noop()).toBe(undefined);
        expect(noop(null)).toBe(undefined);
        expect(noop(true)).toBe(undefined);
        expect(noop(1)).toBe(undefined);
        expect(noop({})).toBe(undefined);
    });
});
