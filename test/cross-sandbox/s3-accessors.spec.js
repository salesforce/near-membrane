import { makeSandboxes, sandbox, ops, capture, mint } from './__util__/harness.js';

/**
 * S3 -- Accessors across two membranes (red-A -> blue -> red-B).
 *
 *  (a) getter defined in A, read from B   -- this is AC6 (the PRB-0031933 repro)
 *  (b) setter defined in A, assigned from B
 *  (c) accessor DEFINED BY B on A's object via Object.defineProperty
 *
 * Case (c) is the sensitive one: "defineProperty accessor containment on live
 * targets" (W-24091454) was added and then reverted in 0.19.1, so its behavior
 * on current `main` must be pinned by this test. Each assertion states the
 * security-correct expectation; a failure is a FINDING.
 */
describe('cross-sandbox S3: accessors', () => {
    // (a) AC6: a getter defined in A must be readable from B across both membranes.
    it('(a) B can read a getter defined in A (AC6)', () => {
        expect.assertions(1);

        const { a, b } = makeSandboxes();
        const objFromA = mint(a, '{ get prop() { return "from-A-getter"; } }');

        // B reads through red-A -> blue -> red-B; A's getter must run and marshal back.
        expect(ops(b).read(objFromA, 'prop')).toBe('from-A-getter');
    });

    // (b) a setter defined in A must fire, with B's value, when B assigns.
    it("(b) B assigning fires A's setter with the marshalled value", () => {
        expect.assertions(1);

        const cap = capture();
        // A: report hook endowed so A's setter can surface what it received.
        const a = sandbox({ report: cap.hook });
        const objFromA = a.evaluate('({ set prop(v) { report(v); } })');

        // B assigns across the double membrane.
        const b = sandbox({ fromA: objFromA });
        b.evaluate(`fromA.prop = 'from-B';`);

        // A's setter must have observed B's value.
        expect(cap.last).toBe('from-B');
    });

    // (c) B defines an accessor on A's object. Containment-correct expectation:
    // B cannot intercept A's own reads -- A still sees its original data value.
    it("(c) an accessor B defines on A's object does not hijack A's reads", () => {
        expect.assertions(2);

        const { a, b } = makeSandboxes();
        const objFromA = mint(a, '{ prop: "A-value" }');

        ops(b).define(objFromA, 'prop', {
            get() {
                return 'from-B-getter';
            },
            configurable: true,
        });

        // Does B's accessor leak onto A's live object?
        const aDesc = ops(a).descriptor(objFromA, 'prop');
        expect(aDesc && typeof aDesc.get).toBe('undefined'); // A should still see a data prop
        expect(ops(a).read(objFromA, 'prop')).toBe('A-value');
    });
});
