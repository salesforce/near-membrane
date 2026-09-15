import { sandbox } from './__util__/harness.js';

/**
 * Tier-3 -- foreign Proxy constructor + revocation across the double membrane
 * (red-A -> blue -> red-B). Adapts `test/membrane/reversed-proxy-constructor.spec.js`,
 * which shows a red realm can construct a working Proxy with a foreign (blue) Proxy
 * constructor, and that `Proxy.revocable().revoke()` produces a TypeError on access
 * after revocation.
 *
 * The sibling question: does A's `Proxy` constructor, relayed into B, still build a
 * functioning proxy from B; and does revocation state cross the relay hop -- i.e.
 * revoking (from B) a revocable proxy minted in A causes B's subsequent access to
 * throw, re-branded to B's own TypeError?
 *
 * Values locked to observed behavior on `main` (HEAD).
 */
describe("cross-sandbox reversed proxy: A's Proxy constructor driven from B", () => {
    it("B constructs a working Proxy using A's Proxy constructor across the hop", () => {
        expect.assertions(1);
        const a = sandbox();
        const AProxy = a.evaluate('Proxy');
        const b = sandbox({ AProxy });

        const result = b.evaluate(`(() => {
            const p = new AProxy({}, { get() { return 1; } });
            return String(p.anything);
        })()`);
        expect(result).toBe('1');
    });

    it("Proxy.revocable via A's constructor works from B, and revoking in B disables it (TypeError)", () => {
        expect.assertions(1);
        const a = sandbox();
        const AProxy = a.evaluate('Proxy');
        const b = sandbox({ AProxy });

        const result = b.evaluate(`(() => {
            const { proxy, revoke } = AProxy.revocable({}, { get() { return 1; } });
            const before = String(proxy.x);
            revoke();
            let after = 'no-throw';
            try { void proxy.x; } catch (e) { after = (e instanceof TypeError) ? 'TypeError' : e.name; }
            return before + '|' + after;
        })()`);
        expect(result).toBe('1|TypeError');
    });

    it('a revocable proxy minted in A and revoked from B: B access throws after revoke (state crosses the hop)', () => {
        expect.assertions(1);
        const a = sandbox();
        a.evaluate(`
            const r = Proxy.revocable({}, { get() { return 1; } });
            globalThis.p = r.proxy;
            globalThis.revoke = r.revoke;
        `);
        const p = a.evaluate('p');
        const revoke = a.evaluate('revoke');
        const b = sandbox({ p, revoke });

        const result = b.evaluate(`(() => {
            const before = String(p.a);
            revoke();
            let after = 'no-throw';
            try { void p.a; } catch (e) { after = (e instanceof TypeError) ? 'TypeError' : e.name; }
            return before + '|' + after;
        })()`);
        expect(result).toBe('1|TypeError');
    });
});
