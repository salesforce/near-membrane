import { sandbox } from './__util__/harness.js';

/**
 * Tier-3 -- global-escape gadget containment + Symbol registry parity across the
 * double membrane (red-A -> blue -> red-B). Adapts the "should not leak outer realm
 * global references" cases in `test/membrane/symbols.spec.js`.
 *
 * The classic sandbox-escape gadget is `fn.constructor.constructor('return this')()`
 * -- reach the Function constructor off any function and evaluate `return this` to
 * grab a global. near-membrane's guarantee is that this resolves to the CALLER's
 * own realm, never the object's origin realm. This spec pins that the guarantee
 * holds when the seed function/object is a SIBLING's (relayed A->B): the gadget run
 * in B must land on B's own global, proving it cannot be used to climb out of B into
 * A's or the host's realm across the relay hop.
 *
 * Also pins Symbol behavior across the hop: registered symbols keep registry parity
 * and unregistered symbols keep identity.
 *
 * Values locked to observed behavior on `main` (HEAD).
 */
describe('cross-sandbox escape gadget: Function-constructor escape is contained to B', () => {
    it("the gadget through an A function resolves to B's own global (not A's, not the host's)", () => {
        expect.assertions(1);
        const a = sandbox();
        a.evaluate('globalThis.af = function () {};');
        const af = a.evaluate('af');
        // `__bMarker` is endowed only into B, so a global carrying it must be B's.
        const b = sandbox({ af, __bMarker: 'B-realm' });

        const result = b.evaluate(`(() => {
            const g = af.constructor.constructor('return this')();
            return [String(g === globalThis), String(g.__bMarker)].join('|');
        })()`);
        expect(result).toBe('true|B-realm');
    });

    it("the gadget through an A object's method is likewise contained to B", () => {
        expect.assertions(1);
        const a = sandbox();
        a.evaluate('globalThis.obj = { m() {} };');
        const obj = a.evaluate('obj');
        const b = sandbox({ obj, __bMarker: 'B-realm' });

        const result = b.evaluate(`(() => {
            const g = obj.m.constructor.constructor('return this')();
            return [String(g === globalThis), String(g.__bMarker)].join('|');
        })()`);
        expect(result).toBe('true|B-realm');
    });
});

describe('cross-sandbox symbol registry parity across the hop', () => {
    it('a registered symbol minted in A is the same registry symbol resolved in B', () => {
        expect.assertions(1);
        const a = sandbox();
        a.evaluate("globalThis.sym = Symbol.for('shared-registry-key');");
        const sym = a.evaluate('sym');
        const b = sandbox({ sym });

        const result = b.evaluate(`(() => {
            const local = Symbol.for('shared-registry-key');
            return [String(sym === local), String(Symbol.keyFor(sym)), typeof sym].join('|');
        })()`);
        expect(result).toBe('true|shared-registry-key|symbol');
    });

    it('an unregistered symbol relayed A->B under two names keeps one identity, no registry key', () => {
        expect.assertions(1);
        const a = sandbox();
        a.evaluate("globalThis.u = Symbol('unique-desc');");
        const u = a.evaluate('u');
        const b = sandbox({ u1: u, u2: u });

        const result = b.evaluate(`(() => {
            return [String(u1 === u2), typeof u1, String(Symbol.keyFor(u1)), u1.description].join('|');
        })()`);
        expect(result).toBe('true|symbol|undefined|unique-desc');
    });
});
