import { makeSandboxes, mint } from './__util__/harness.js';

/**
 * Liveness by object KIND across the double membrane (red-A -> blue -> red-B).
 *
 * Adapts the single-crossing liveness catalog -- `test/membrane/life-red-proxies.spec.js`,
 * `test/membrane/expandos.spec.js`, the generic class-liveness sub-tests of
 * `test/dom/live-object.spec.js`, and the marker disambiguation of
 * `test/membrane/trap-mutations.spec.js` -- to two sandboxes.
 *
 * Where `liveness-matrix.spec.js` varies the descriptor SHAPE on one shared live
 * object, this spec varies the object KIND: for each kind we mint it in A, relay
 * it to B, and characterize whether a B-side mutation propagates back to A (and the
 * reverse). It extends the array/typed-array auto-liveness finding (see
 * arrays.spec.js / typed-data.spec.js) to the rest of the catalog: plain objects
 * (opt-in via the `@@lockerLiveValue` marker), null-proto objects, RegExp, and a
 * custom exotic class instance are callback-gated; DataView / ArrayBuffer views are
 * auto-live independent of the callback.
 *
 * Both sandboxes use a marker-only `liveTargetCallback`, so an object is live iff it
 * carries `@@lockerLiveValue`. Values locked to `main` (HEAD) by characterization.
 */
const MARKER = Symbol.for('@@lockerLiveValue');

function liveTargetCallback(target) {
    try {
        return Object.hasOwn(target, MARKER);
    } catch {
        return false;
    }
}

// Two sandboxes that both treat marker-stamped targets as live.
function sandboxes() {
    return makeSandboxes({ liveTargetCallback }, { liveTargetCallback });
}

// A-minted value expressions. `mint` wraps in parens, so each is an expression.
const PLAIN = '{ tag: "A" }';
const PLAIN_LIVE =
    '(() => { const o = { tag: "A" }; o[Symbol.for("@@lockerLiveValue")] = true; return o; })()';
const NULLPROTO = '(() => { const o = Object.create(null); o.tag = "A"; return o; })()';
const NULLPROTO_LIVE =
    '(() => { const o = Object.create(null); o.tag = "A"; o[Symbol.for("@@lockerLiveValue")] = true; return o; })()';
const EXOTIC_LIVE =
    '(() => { class Widget { constructor() { this.tag = "A"; } }; const o = new Widget(); o[Symbol.for("@@lockerLiveValue")] = true; return o; })()';
const EXOTIC_PLAIN =
    '(() => { class Widget { constructor() { this.tag = "A"; } }; return new Widget(); })()';
const REGEXP = '/abc/g';

// B adds an expando; returns B's local view of it.
const B_ADD = '(o) => { o.added = "by-B"; return String(o.added); }';
// A reads the expando as A sees it (authoritative A-side view).
const A_READ_ADDED = '(o) => String(o.added)';

describe('cross-sandbox liveness by kind: named-property (expando) writes, callback-gated', () => {
    it('plain object WITHOUT marker: B expando is CONTAINED (baseline)', () => {
        expect.assertions(1);
        const { a, b } = sandboxes();
        const o = mint(a, PLAIN);
        const bSees = b.evaluate(B_ADD)(o);
        const aSees = a.evaluate(A_READ_ADDED)(o);
        expect(`bSees=${bSees}|aSees=${aSees}`).toBe('bSees=by-B|aSees=undefined');
    });

    it('plain object WITH marker: B expando is LIVE (A observes)', () => {
        expect.assertions(1);
        const { a, b } = sandboxes();
        const o = mint(a, PLAIN_LIVE);
        const bSees = b.evaluate(B_ADD)(o);
        const aSees = a.evaluate(A_READ_ADDED)(o);
        expect(`bSees=${bSees}|aSees=${aSees}`).toBe('bSees=by-B|aSees=by-B');
    });

    it('null-proto object WITHOUT marker: B expando is CONTAINED', () => {
        expect.assertions(1);
        const { a, b } = sandboxes();
        const o = mint(a, NULLPROTO);
        const bSees = b.evaluate(B_ADD)(o);
        const aSees = a.evaluate(A_READ_ADDED)(o);
        expect(`bSees=${bSees}|aSees=${aSees}`).toBe('bSees=by-B|aSees=undefined');
    });

    it('null-proto object WITH marker: B expando is LIVE (A observes)', () => {
        expect.assertions(1);
        const { a, b } = sandboxes();
        const o = mint(a, NULLPROTO_LIVE);
        const bSees = b.evaluate(B_ADD)(o);
        const aSees = a.evaluate(A_READ_ADDED)(o);
        expect(`bSees=${bSees}|aSees=${aSees}`).toBe('bSees=by-B|aSees=by-B');
    });

    it('custom exotic class instance WITH marker: B expando is LIVE (A observes)', () => {
        expect.assertions(1);
        const { a, b } = sandboxes();
        const o = mint(a, EXOTIC_LIVE);
        const bSees = b.evaluate(B_ADD)(o);
        const aSees = a.evaluate(A_READ_ADDED)(o);
        expect(`bSees=${bSees}|aSees=${aSees}`).toBe('bSees=by-B|aSees=by-B');
    });

    it('RegExp WITHOUT marker: B expando is CONTAINED (RegExp is not auto-live)', () => {
        expect.assertions(1);
        const { a, b } = sandboxes();
        const o = mint(a, REGEXP);
        const bSees = b.evaluate(B_ADD)(o);
        const aSees = a.evaluate(A_READ_ADDED)(o);
        expect(`bSees=${bSees}|aSees=${aSees}`).toBe('bSees=by-B|aSees=undefined');
    });

    it('reverse visibility: A-side write on a live plain object is observed by B', () => {
        expect.assertions(1);
        const { a, b } = sandboxes();
        const o = mint(a, PLAIN_LIVE);
        a.evaluate('(o) => { o.k = "from-A"; return "ok"; }')(o);
        const bReads = b.evaluate('(o) => String(o.k)')(o);
        expect(`bReads=${bReads}`).toBe('bReads=from-A');
    });
});

describe('cross-sandbox liveness by kind: exotic views (auto-live, no marker needed)', () => {
    it('DataView minted in A: B byte write is LIVE (A observes via getInt8)', () => {
        expect.assertions(1);
        const { a, b } = sandboxes();
        const dv = mint(a, 'new DataView(new ArrayBuffer(8))');
        const bWrote = b.evaluate('(dv) => { dv.setInt8(0, 42); return "ok"; }')(dv);
        const aByte = a.evaluate('(dv) => dv.getInt8(0)')(dv);
        expect(`bWrote=${bWrote}|aByte=${aByte}`).toBe('bWrote=ok|aByte=42');
    });

    it('ArrayBuffer minted in A: B writes a byte through a fresh view over it', () => {
        expect.assertions(1);
        const { a, b } = sandboxes();
        const buf = mint(a, 'new ArrayBuffer(8)');
        const bWrote = b.evaluate(
            '(buf) => { try { new Uint8Array(buf)[0] = 7; return "ok"; } catch (e) { return "threw:" + e.name; } }'
        )(buf);
        const aByte = a.evaluate(
            '(buf) => { try { return String(new Uint8Array(buf)[0]); } catch (e) { return "threw:" + e.name; } }'
        )(buf);
        expect(`bWrote=${bWrote}|aByte=${aByte}`).toBe('bWrote=ok|aByte=7');
    });
});

describe('cross-sandbox liveness by kind: runtime marker stamping (trap-mutations analog)', () => {
    it('stamping the marker in B mid-life does not retroactively make an exotic instance live for A', () => {
        expect.assertions(1);
        const { a, b } = sandboxes();
        const o = mint(a, EXOTIC_PLAIN);
        // First write with no marker -> contained.
        const b1 = b.evaluate('(o) => { o.a1 = "one"; return String(o.a1); }')(o);
        const a1 = a.evaluate('(o) => String(o.a1)')(o);
        // B stamps the marker on its own proxy then writes again.
        const b2 = b.evaluate(
            '(o) => { o[Symbol.for("@@lockerLiveValue")] = true; o.a2 = "two"; return String(o.a2); }'
        )(o);
        const a2 = a.evaluate('(o) => String(o.a2)')(o);
        expect(`b1=${b1}|a1=${a1}|b2=${b2}|a2=${a2}`).toBe(
            'b1=one|a1=undefined|b2=two|a2=undefined'
        );
    });
});
