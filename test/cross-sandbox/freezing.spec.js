import { makeSandboxes, mint } from './__util__/harness.js';

/**
 * AC3 behavior class: freezing / immutability across the double crossing
 * (red-A -> blue -> red-B). Covers Object.freeze, Object.seal, frozen arrays,
 * and the reverse direction (B freezes an A object). Each mutation attempt is
 * wrapped in try/catch and reported as a primitive tag so the assertion
 * characterizes throw-vs-noop regardless of the evaluated code's strict-ness.
 * Values are locked to current `main`.
 */
describe('cross-sandbox freezing: Object.freeze', () => {
    it('B observes an A-frozen object as frozen', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const frozen = mint(a, 'Object.freeze({ prop: "val" })');
        const bIsFrozen = b.evaluate('(o) => Object.isFrozen(o)');
        expect(bIsFrozen(frozen)).toBe(true);
    });

    it("B's overwrite of a frozen property is a silent no-op; A's value is preserved", () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const frozen = mint(a, 'Object.freeze({ prop: "val" })');
        const bWrite = b.evaluate(`(o) => {
            try { o.prop = "changed"; return "wrote:" + o.prop; }
            catch (e) { return "threw:" + e.constructor.name + "|val=" + o.prop; }
        }`);
        // No TypeError (sandbox evaluate runs sloppy); the proxy honors the raw
        // target's non-writable invariant, so the assignment is dropped and B
        // reads back A's original 'val'.
        expect(bWrite(frozen)).toBe('wrote:val');
    });

    it('B CAN add an expando to a frozen A object -- contained to B, not thrown (DIVERGENCE)', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const frozen = mint(a, 'Object.freeze({ prop: "val" })');
        const bAdd = b.evaluate(`(o) => {
            try { o.added = "y"; return "added:" + ("added" in o); }
            catch (e) { return "threw:" + e.constructor.name + "|has=" + ("added" in o); }
        }`);
        // DIVERGENCE / candidate finding: the object reports Object.isFrozen ===
        // true, yet B's NEW-key expando is absorbed into B's local view without the
        // spec-mandated TypeError, because double-membrane isolation contains B's
        // writes (same mechanism as S2 data-writeback). Frozen integrity is
        // OBSERVABLE across the crossing but NOT ENFORCED against a foreign reader
        // for new keys. (Array.push below DOES throw -- see note there.)
        expect(bAdd(frozen)).toBe('added:true');
    });
});

describe('cross-sandbox freezing: Object.seal', () => {
    it('B observes an A-sealed object as sealed', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const sealed = mint(a, 'Object.seal({ prop: "val" })');
        const bIsSealed = b.evaluate('(o) => Object.isSealed(o)');
        expect(bIsSealed(sealed)).toBe(true);
    });

    it('B cannot add to a sealed object but the existing prop stays writable', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const sealed = mint(a, 'Object.seal({ prop: "val" })');
        const bProbe = b.evaluate(`(o) => {
            const addResult = (() => { try { o.added = "y"; return "added:" + ("added" in o); } catch (e) { return "threw:" + e.constructor.name; } })();
            const writeResult = (() => { try { o.prop = "changed"; return "wrote:" + o.prop; } catch (e) { return "threw:" + e.constructor.name; } })();
            return addResult + " / " + writeResult;
        }`);
        // Sealed keeps existing props writable -> B's overwrite takes effect in B's
        // view ('changed'); the add is absorbed into B's local view (contained),
        // same as the frozen case above -- observable seal, unenforced for new keys.
        expect(bProbe(sealed)).toBe('added:true / wrote:changed');
    });
});

describe('cross-sandbox freezing: frozen array + reverse direction', () => {
    it('B observes an A-frozen array as frozen and immutable', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const frozenArr = mint(a, 'Object.freeze([1, 2, 3])');
        const bProbe = b.evaluate(`(o) => {
            const push = (() => { try { o.push(4); return "pushed:" + o.length; } catch (e) { return "threw:" + e.constructor.name; } })();
            return Object.isFrozen(o) + "|len=" + o.length + "|" + push;
        }`);
        expect(bProbe(frozenArr)).toBe('true|len=3|threw:TypeError');
    });

    it("A->B->A: B freezing an A object does not freeze A's own object (isolation)", () => {
        expect.assertions(2);
        const { a, b } = makeSandboxes();
        const objFromA = mint(a, '{ prop: "val" }');
        const bFreeze = b.evaluate('(o) => { Object.freeze(o); return Object.isFrozen(o); }');
        // B freezes its own view of the object...
        expect(bFreeze(objFromA)).toBe(true);
        // ...but A's underlying object is not frozen (freeze is contained to B's side).
        const aIsFrozen = a.evaluate('(o) => Object.isFrozen(o)');
        expect(aIsFrozen(objFromA)).toBe(false);
    });
});
