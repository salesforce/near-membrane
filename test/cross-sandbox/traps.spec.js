import { makeSandboxes, mint, ops } from './__util__/harness.js';

/**
 * AC3 -- get/set/ownKeys/has traps across the double membrane
 * (red-A -> blue -> red-B).
 *
 * The double-wrapped proxy B holds must still present A's object with correct
 * meta-object semantics: own-key ORDER (integer indices ascending, then string
 * keys in insertion order), `has`, and enumeration honoring enumerability. get/set
 * value marshalling is covered by the s2/s3/liveness specs; here we pin the
 * structural traps. Values locked to `main`.
 */
describe('cross-sandbox traps: ownKeys / has / enumeration', () => {
    it('ownKeys order is preserved through the double crossing (indices asc, then insertion)', () => {
        expect.assertions(1);

        const { a, b } = makeSandboxes();
        const keysInB = b.evaluate('(o) => Object.keys(o).join(",")');
        // Insertion order deliberately scrambled vs. spec order.
        const objFromA = mint(a, '({ b: 1, a: 2, 2: "two", 1: "one" })');

        // Spec ordering: integer-index keys ascending first, then string keys
        // in insertion order.
        expect(keysInB(objFromA)).toBe('1,2,b,a');
    });

    it('getOwnPropertyNames order is preserved as seen from B', () => {
        expect.assertions(1);

        const { a, b } = makeSandboxes();
        const namesInB = b.evaluate('(o) => Object.getOwnPropertyNames(o).join(",")');
        const objFromA = mint(a, '({ x: 1, y: 2, z: 3 })');

        expect(namesInB(objFromA)).toBe('x,y,z');
    });

    it('has trap resolves present and absent keys correctly from B', () => {
        expect.assertions(2);

        const { a, b } = makeSandboxes();
        const bOps = ops(b);
        const objFromA = mint(a, '({ present: 1 })');

        expect(bOps.has(objFromA, 'present')).toBe(true);
        expect(bOps.has(objFromA, 'absent')).toBe(false);
    });

    it('non-enumerable keys are hidden from B enumeration but visible to has / getOwnPropertyNames', () => {
        expect.assertions(3);

        const { a, b } = makeSandboxes();
        const objFromA = mint(
            a,
            '(() => { const o = { visible: 1 }; Object.defineProperty(o, "hidden", { value: 2, enumerable: false }); return o; })()'
        );
        const enumKeysInB = b.evaluate('(o) => Object.keys(o).join(",")');
        const allNamesInB = b.evaluate('(o) => Object.getOwnPropertyNames(o).sort().join(",")');
        const hasHiddenInB = b.evaluate('(o) => "hidden" in o');

        expect(enumKeysInB(objFromA)).toBe('visible');
        expect(allNamesInB(objFromA)).toBe('hidden,visible');
        expect(hasHiddenInB(objFromA)).toBe(true);
    });

    it('for..in from B walks A object enumerable keys', () => {
        expect.assertions(1);

        const { a, b } = makeSandboxes();
        const forInInB = b.evaluate(
            '(o) => { const ks = []; for (const k in o) ks.push(k); return ks.join(","); }'
        );
        const objFromA = mint(a, '({ a: 1, b: 2 })');

        expect(forInInB(objFromA)).toBe('a,b');
    });
});
