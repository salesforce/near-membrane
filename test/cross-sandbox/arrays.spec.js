import { makeSandboxes, mint } from './__util__/harness.js';

/**
 * AC3 -- arrays across the double membrane (red-A -> blue -> red-B).
 *
 * A mints an array; B recognizes it as an Array, reads it, iterates/spreads it,
 * and mutates it. Values are locked to `main`.
 *
 * LIVENESS FINDING (RECONCILED): B's mutations to an A-minted array (push, index
 * write, sort, reverse) DO propagate back to A -- cross-sandbox array writes are
 * LIVE. This is NOT a contradiction of `s2-data-writeback.spec.js` (which locks a
 * plain-object data write as CONTAINED): a side-by-side experiment confirmed both
 * are correct on `main`. The SAME `o[k] = v` operation is CONTAINED for an
 * ordinary object but LIVE for an Array -- cross-sandbox write-back liveness is
 * object-KIND dependent (exotic Array / TypedArray targets propagate index/length
 * writes back to the originating sandbox; plain objects do not). Arrays being live
 * is intended near-membrane behavior, not a bug; these tests lock that behavior
 * and its contrast with plain-object containment.
 */
describe('cross-sandbox arrays: A array -> B', () => {
    it('B recognizes and reads an A-minted array (identity, length, index, reduce/map, spread, for-of)', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const arr = mint(a, '[1, 2, 3]');
        const probe = b.evaluate(`(o) => JSON.stringify({
            isArray: Array.isArray(o),
            length: o.length,
            first: o[0],
            sum: o.reduce((acc, c) => acc + c, 0),
            mapped: o.map((x) => x * 2).join(','),
            spread: [...o].join(','),
            forOf: (() => { let s = ''; for (const x of o) s += x; return s; })(),
        })`);
        expect(probe(arr)).toBe(
            '{"isArray":true,"length":3,"first":1,"sum":6,"mapped":"2,4,6","spread":"1,2,3","forOf":"123"}'
        );
    });

    it('A observes B push + index write on an A-minted array (LIVE cross-sandbox write)', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const arr = mint(a, '[1, 2, 3]');
        const bMutate = b.evaluate(`(o) => { o.push(4); o[0] = 99; return o.length; }`);
        const bLen = bMutate(arr);
        const aView = a.evaluate(
            `(o) => JSON.stringify({ length: o.length, first: o[0], joined: o.join(',') })`
        );
        // LIVE: A sees B's push (length 4) and index write (first 99). Contrast with
        // s2-data-writeback.spec.js, which locks a plain-object write as CONTAINED.
        expect(`bLen=${bLen} aView=${aView(arr)}`).toBe(
            'bLen=4 aView={"length":4,"first":99,"joined":"99,2,3,4"}'
        );
    });

    it('A observes B sort + reverse on an A-minted array (LIVE cross-sandbox mutation)', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const arr = mint(a, '[3, 1, 2]');
        const bSort = b.evaluate(`(o) => { o.sort(); o.reverse(); return o.join(','); }`);
        const bView = bSort(arr);
        const aJoin = a.evaluate(`(o) => o.join(',')`);
        // Both realms see the same reordered array -> the in-place mutation is live.
        expect(`bView=${bView} aView=${aJoin(arr)}`).toBe('bView=3,2,1 aView=3,2,1');
    });
});

describe('cross-sandbox arrays: B array -> A (reverse direction)', () => {
    it('A reads a B-minted array', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const arrB = mint(b, '[9, 8, 7]');
        const aProbe = a.evaluate(`(o) => JSON.stringify({
            isArray: Array.isArray(o),
            length: o.length,
            sum: o.reduce((acc, c) => acc + c, 0),
        })`);
        expect(aProbe(arrB)).toBe('{"isArray":true,"length":3,"sum":24}');
    });
});
