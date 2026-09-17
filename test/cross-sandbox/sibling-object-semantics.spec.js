import { sandbox } from './__util__/harness.js';

/**
 * Tier-3 -- object semantics across the double membrane (red-A -> blue -> red-B):
 * get-trap fallback along the prototype chain, null-prototype enforcement, and the
 * writable -> non-writable ("write-then-lock") transition. Adapts
 * `test/membrane/object-semantics.spec.js` plus the get-trap / null-proto cases in
 * the single-crossing suite.
 *
 * These complement `s2-data-writeback` / `red-to-red-endowment` (which pin plain
 * write CONTAINMENT and array liveness) by pinning the READ-side contract: a static
 * proxy passes reads through to the authoritative A target UNTIL B writes its own
 * shadow, after which B reads its shadow and A-side changes go unseen; and by
 * pinning inherited-property lookup and null-proto handling over two hops.
 *
 * Values locked to observed behavior on `main` (HEAD). NOTE: `env.evaluate` bodies
 * run SLOPPY, so a write to a non-writable property no-ops rather than throwing.
 */
describe('cross-sandbox object semantics: get-trap + prototype chain A->B', () => {
    it('B reads own AND inherited properties off an A object; a missing property is undefined', () => {
        expect.assertions(1);
        const a = sandbox();
        a.evaluate(`
            const proto = { inherited: 'from-proto' };
            globalThis.child = Object.create(proto, { own: { value: 'own-val', enumerable: true } });
        `);
        const child = a.evaluate('child');
        const b = sandbox({ child });

        const result = b.evaluate(`(() => {
            return [child.own, child.inherited, String(child.missing)].join('|');
        })()`);
        expect(result).toBe('own-val|from-proto|undefined');
    });

    it('a null-prototype A object crosses to B with null proto and readable own props', () => {
        expect.assertions(1);
        const a = sandbox();
        a.evaluate(
            "globalThis.bare = Object.create(null, { k: { value: 'v', enumerable: true } });"
        );
        const bare = a.evaluate('bare');
        const b = sandbox({ bare });

        const result = b.evaluate(`(() => {
            const protoNull = Reflect.getPrototypeOf(bare) === null;
            const hasOwn = Object.prototype.hasOwnProperty.call(bare, 'k');
            return [String(protoNull), String(bare.k), String(hasOwn)].join('|');
        })()`);
        expect(result).toBe('true|v|true');
    });
});

describe('cross-sandbox object semantics: write-then-lock / shadow divergence', () => {
    it('a static proxy passes reads through to A until B writes, then B reads its own shadow', () => {
        expect.assertions(1);
        const a = sandbox();
        a.evaluate('globalThis.o = { x: 1 };');
        const o = a.evaluate('o');
        const setX = a.evaluate('(v) => { o.x = v; }');
        const b = sandbox({ o });

        const r1 = b.evaluate('String(o.x)'); // pass-through -> A's 1
        setX(2); // A mutates its own object
        const r2 = b.evaluate('String(o.x)'); // pass-through -> A's 2 (no B write yet)
        const r3 = b.evaluate('o.x = 99; String(o.x)'); // B writes its shadow -> 99
        setX(3); // A mutates again
        const r4 = b.evaluate('String(o.x)'); // B now reads its shadow -> 99, A's 3 unseen

        expect([r1, r2, r3, r4].join('|')).toBe('1|2|99|99');
    });

    it('B write to a NON-writable A property no-ops silently (sloppy evaluate); read stays original', () => {
        expect.assertions(1);
        const a = sandbox();
        a.evaluate(
            'globalThis.locked = {}; Object.defineProperty(locked, "k", { value: "locked", writable: false, enumerable: true, configurable: false });'
        );
        const locked = a.evaluate('locked');
        const b = sandbox({ locked });

        const result = b.evaluate('locked.k = "hacked"; String(locked.k);');
        expect(result).toBe('locked');
    });
});
