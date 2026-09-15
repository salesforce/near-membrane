import { makeSandboxes, mint } from './__util__/harness.js';

/**
 * AC3 -- object identity & semantics across the double membrane
 * (red-A -> blue -> red-B).
 *
 * An object minted in A unwraps at A's membrane back to the blue target; when B
 * re-wraps it, the membrane's blue->red WeakMap must hand back the SAME red-B
 * proxy every time, so identity survives the double crossing (AC5). These tests
 * pin that invariant plus basic cross-membrane `typeof` semantics, in both the
 * A->B and A->B->A directions (AC4).
 */
describe('cross-sandbox identity: object identity & semantics', () => {
    it('relaying the same A object into B twice yields the same B proxy', () => {
        expect.assertions(1);

        const { a, b } = makeSandboxes();
        // Identity comparison performed INSIDE B, so it compares B's own proxies.
        const sameInB = b.evaluate('(x, y) => x === y');
        const objFromA = mint(a, '({ tag: "A" })');

        // Same blue target relayed twice -> B must produce one stable proxy.
        expect(sameInB(objFromA, objFromA)).toBe(true);
    });

    it('two distinct A objects remain distinct in B', () => {
        expect.assertions(1);

        const { a, b } = makeSandboxes();
        const sameInB = b.evaluate('(x, y) => x === y');
        const o1 = mint(a, '({ n: 1 })');
        const o2 = mint(a, '({ n: 2 })');

        expect(sameInB(o1, o2)).toBe(false);
    });

    it('A->B->A round-trip restores the original A object identity', () => {
        expect.assertions(1);

        const { a, b } = makeSandboxes();
        const passThroughB = b.evaluate('(o) => o');
        const sameInA = a.evaluate('(x, y) => x === y');

        const original = mint(a, '({ tag: "A" })');
        const viaB = passThroughB(original); // red-A -> blue -> red-B -> blue

        // Back in A, the round-tripped object must be the original red-A object.
        expect(sameInA(viaB, original)).toBe(true);
    });

    it('typeof an A function is "function" and an A object is "object" as seen from B', () => {
        expect.assertions(2);

        const { a, b } = makeSandboxes();
        const typeofInB = b.evaluate('(o) => typeof o');

        expect(typeofInB(mint(a, 'function fromA() {}'))).toBe('function');
        expect(typeofInB(mint(a, '({})'))).toBe('object');
    });
});
