import { makeSandboxes } from './__util__/harness.js';

/**
 * AC3 behavior class: internal-slot protection across the double membrane
 * (red-A -> blue -> red-B).
 *
 * Built-ins with internal slots (Map/Set/Date) are brand-checked: their methods
 * only work on receivers that actually carry the slot. We pin that A's Map/Set/Date
 * relayed to B remain fully operable from B (the membrane preserves the brand), and
 * that B's own brand-checked method applied to a non-branded A object throws -- the
 * slot protection is not bypassable across the membrane.
 * AC4: A->B (B operates A's built-ins) and the negative brand-check case.
 *
 * Values locked to `main`.
 */
describe('cross-sandbox internal slots: A built-ins operable from B (A->B)', () => {
    it('B operates on a Map minted in A (brand preserved across the membrane)', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const mapFromA = a.evaluate('new Map([["k", "v"], ["n", 42]])');
        const probe = b.evaluate(`(m) => {
            try {
                return 'get=' + m.get('k') + '|has=' + m.has('n') + '|size=' + m.size;
            } catch (e) { return 'threw:' + e.name; }
        }`);
        expect(probe(mapFromA)).toBe('get=v|has=true|size=2');
    });

    it('B operates on a Set minted in A (brand preserved across the membrane)', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const setFromA = a.evaluate('new Set([1, 2, 3])');
        const probe = b.evaluate(`(s) => {
            try {
                return 'has2=' + s.has(2) + '|has9=' + s.has(9) + '|size=' + s.size;
            } catch (e) { return 'threw:' + e.name; }
        }`);
        expect(probe(setFromA)).toBe('has2=true|has9=false|size=3');
    });

    it('B reads a Date minted in A (brand preserved across the membrane)', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const dateFromA = a.evaluate('new Date(0)');
        const probe = b.evaluate(`(d) => {
            try {
                return 'time=' + d.getTime() + '|iso=' + d.toISOString();
            } catch (e) { return 'threw:' + e.name; }
        }`);
        expect(probe(dateFromA)).toBe('time=0|iso=1970-01-01T00:00:00.000Z');
    });
});

describe('cross-sandbox internal slots: brand check holds across the membrane', () => {
    it('B applying Map.prototype.get to a non-Map A object throws (brand check not bypassable)', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const plainFromA = a.evaluate('({ k: "v" })');
        const probe = b.evaluate(`(o) => {
            try {
                Map.prototype.get.call(o, 'k');
                return 'no-throw';
            } catch (e) { return e.name; }
        }`);
        // The missing [[MapData]] internal slot is enforced even across the double membrane.
        expect(probe(plainFromA)).toBe('TypeError');
    });
});
