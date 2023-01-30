import { identity, noop } from '../../dist/index.mjs.js';

describe('Function', () => {
    it('identity', () => {
        expect(identity()).toBe(undefined);
        expect(identity(null)).toBe(null);
        expect(identity(true)).toBe(true);
        expect(identity(1)).toBe(1);
        const o = {};
        expect(identity(o)).toBe(o);
    });
    it('noop', () => {
        expect(noop()).toBe(undefined);
        expect(noop(null)).toBe(undefined);
        expect(noop(true)).toBe(undefined);
        expect(noop(1)).toBe(undefined);
        expect(noop({})).toBe(undefined);
    });
});
