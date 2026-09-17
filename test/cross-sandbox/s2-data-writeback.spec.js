import { makeSandboxes, ops, mint } from './__util__/harness.js';

/**
 * S2 -- Data-property writes across two membranes are CONTAINED (isolation).
 *
 * A mints `o = { prop: 'A-value' }`; the object is relayed to B; B assigns
 * `o.prop = 'B-value'` (and adds a fresh expando). Characterized behavior on
 * current `main`: B's mutations stay on B's side of the double membrane and A's
 * object is untouched -- correct cross-sandbox isolation (B cannot reach into A).
 *
 * NOTE ON DIVERGENCE: this is deliberately different from the SINGLE-crossing
 * (blue<->red) case, where a red-realm write to a blue-owned object IS live and
 * propagates to blue. Across two sandboxes the write does not propagate back to
 * the originating sandbox. These assertions lock that isolation as a regression
 * guard; if a future change makes cross-sandbox writes live, this suite fails and
 * forces the divergence to be re-examined.
 *
 * NB (object-kind dependence, confirmed by side-by-side experiment): this
 * containment is specific to ORDINARY objects. Arrays and TypedArrays DO propagate
 * index/length writes back to the originating sandbox (see arrays.spec.js and
 * typed-data.spec.js) -- the identical `o[k] = v` is contained here but live for an
 * Array. Cross-sandbox write-back liveness is object-kind dependent.
 */
describe('cross-sandbox S2: data property writes are contained', () => {
    it('A does NOT observe a data-property write performed by B', () => {
        expect.assertions(3);

        const { a, b } = makeSandboxes();
        const aOps = ops(a);
        const bOps = ops(b);

        const objFromA = mint(a, '{ prop: "A-value" }');

        // A sees its own value first.
        expect(aOps.read(objFromA, 'prop')).toBe('A-value');

        // B writes across red-A -> blue -> red-B; B sees its own write locally.
        const bView = bOps.write(objFromA, 'prop', 'B-value');
        expect(bView).toBe('B-value');

        // ...but A is unaffected: the write is contained to B's side.
        expect(aOps.read(objFromA, 'prop')).toBe('A-value');
    });

    it('A does NOT observe a NEW expando added by B', () => {
        expect.assertions(2);

        const { a, b } = makeSandboxes();
        const aOps = ops(a);
        const bOps = ops(b);

        const objFromA = mint(a, '{ prop: "A-value" }');

        bOps.write(objFromA, 'added', 'by-B');

        // The key B added does not leak onto A's object.
        expect(aOps.has(objFromA, 'added')).toBe(false);
        expect(aOps.read(objFromA, 'added')).toBe(undefined);
    });
});
