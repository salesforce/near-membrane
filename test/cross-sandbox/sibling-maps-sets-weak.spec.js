import { makeSandboxes } from './__util__/harness.js';

/**
 * Cross-sandbox Map / Set / WeakMap / WeakSet / WeakRef across the double
 * membrane (red-A -> blue -> red-B).
 *
 * Complements `internal-slots.spec.js`, which covers Map/Set/Date READS and
 * brand-checks only. This spec adds the two things that were missing:
 *   1. MUTATION liveness -- does B calling `.set`/`.add`/`.delete` on a
 *      collection minted in A propagate back to A? Maps/Sets are NOT on the
 *      Array/ArrayBufferView auto-live path (see near-membrane-array-auto-live),
 *      but their mutators are METHODS that operate on the receiver's internal
 *      slot, and the read tests already prove those methods reach A's real
 *      [[MapData]]/[[SetData]] (brand preserved). So mutation MIGHT be live even
 *      though property writes on a plain object are contained. This spec MEASURES
 *      it rather than assuming.
 *   2. Weak collections + WeakRef, which have ZERO real cross-membrane coverage
 *      today -- the extant `test/membrane/weakrefs.spec.js` never actually
 *      crosses a referent. The key question is whether object-KEY identity
 *      survives the double crossing so a WeakMap/WeakSet lookup resolves.
 *
 * Values are locked to observed behavior on `main` (HEAD).
 */
describe('cross-sandbox Map/Set mutation liveness (A -> B)', () => {
    it('B set + delete on an A-minted Map: A observes the mutation (LIVE via slot-bearing method)', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const mapFromA = a.evaluate('(new Map([["k", "v"], ["n", 42]]))');

        const bMutate = b.evaluate(`(m) => {
            m.set('x', 1);
            m.delete('k');
            return 'B:size=' + m.size + '|hasX=' + m.has('x') + '|hasK=' + m.has('k');
        }`);
        const bView = bMutate(mapFromA);

        const aView = a.evaluate(`(m) =>
            'A:size=' + m.size + '|getX=' + m.get('x') + '|hasK=' + m.has('k')`)(mapFromA);

        // Mutating methods operate on A's real [[MapData]] (brand preserved by
        // unwrapping the receiver), so B's set/delete DO reach A -- unlike a plain
        // data-property write, which is contained (see s2-data-writeback.spec.js).
        expect(`${bView} :: ${aView}`).toBe(
            'B:size=2|hasX=true|hasK=false :: A:size=2|getX=1|hasK=false'
        );
    });

    it('B add + delete on an A-minted Set: A observes the mutation (LIVE)', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const setFromA = a.evaluate('(new Set([1, 2, 3]))');

        const bMutate = b.evaluate(`(s) => {
            s.add(4);
            s.delete(1);
            return 'B:size=' + s.size + '|has4=' + s.has(4) + '|has1=' + s.has(1);
        }`);
        const bView = bMutate(setFromA);

        const aView = a.evaluate(`(s) =>
            'A:size=' + s.size + '|has4=' + s.has(4) + '|has1=' + s.has(1)`)(setFromA);

        expect(`${bView} :: ${aView}`).toBe(
            'B:size=3|has4=true|has1=false :: A:size=3|has4=true|has1=false'
        );
    });

    it('reverse: A add on a B-minted Set is observed by B (LIVE both directions)', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const setFromB = b.evaluate('(new Set(["b"]))');

        a.evaluate(`(s) => { s.add('a'); }`)(setFromB);

        const bView = b.evaluate(`(s) =>
            'size=' + s.size + '|hasA=' + s.has('a') + '|hasB=' + s.has('b')`)(setFromB);
        expect(bView).toBe('size=2|hasA=true|hasB=true');
    });
});

describe('cross-sandbox WeakMap/WeakSet key identity (A -> B)', () => {
    it('WeakMap minted in A, A-origin key relayed to B: B set then get/has resolves; A observes it', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        // Mint the WeakMap and a key object together so both are A-native.
        const rec = a.evaluate('(() => ({ wm: new WeakMap(), key: { id: "A-key" } }))()');

        const bView = b.evaluate(`(r) => {
            r.wm.set(r.key, 'B-val');
            return 'get=' + r.wm.get(r.key) + '|has=' + r.wm.has(r.key);
        }`)(rec);

        // Does the entry B wrote (keyed on the A-origin object relayed through
        // blue) resolve back in A? -> whether key identity survives the double hop.
        const aView = a.evaluate(`(r) =>
            'get=' + r.wm.get(r.key) + '|has=' + r.wm.has(r.key)`)(rec);

        expect(`B:${bView} :: A:${aView}`).toBe('B:get=B-val|has=true :: A:get=B-val|has=true');
    });

    it('WeakMap minted in A, B-native key: lookup resolves within B', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const wmFromA = a.evaluate('(new WeakMap())');

        const bView = b.evaluate(`(wm) => {
            const bKey = { id: 'B-key' };
            wm.set(bKey, 'via-B-key');
            return 'get=' + wm.get(bKey) + '|has=' + wm.has(bKey);
        }`)(wmFromA);

        expect(bView).toBe('get=via-B-key|has=true');
    });

    it('WeakSet minted in A, A-origin member relayed to B: add then has resolves; A observes it', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const rec = a.evaluate('(() => ({ ws: new WeakSet(), member: { id: "A-mem" } }))()');

        const bView = b.evaluate(`(r) => {
            r.ws.add(r.member);
            return 'has=' + r.ws.has(r.member);
        }`)(rec);

        const aView = a.evaluate(`(r) => 'has=' + r.ws.has(r.member)`)(rec);

        expect(`B:${bView} :: A:${aView}`).toBe('B:has=true :: A:has=true');
    });
});

describe('cross-sandbox WeakRef deref (A -> B)', () => {
    it('WeakRef minted in A over an A object: deref() from B returns the same relayed reference', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const rec = a.evaluate(
            '(() => { const obj = { tag: "A" }; return { obj, wr: new WeakRef(obj) }; })()'
        );

        const bView = b.evaluate(`(r) => {
            const d = r.wr.deref();
            return 'sameRef=' + (d === r.obj) + '|tag=' + (d ? d.tag : 'null');
        }`)(rec);

        // deref must return a reference whose identity matches the relayed object
        // as seen in B (proxy identity preserved across the double crossing).
        expect(bView).toBe('sameRef=true|tag=A');
    });
});
