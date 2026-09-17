import { sandbox, capture } from './__util__/harness.js';

/**
 * AC6 control -- the SAME cross-namespace accessor-sharing flow as
 * `ac6-cross-namespace-getter-sharing.spec.js`, but on a PLAIN (non-live) shared
 * object. This isolates LIVENESS as the trigger for the PRB-0031933 regression.
 *
 * For a non-live target, near-membrane's `defineProperty` trap is NOT passthru:
 * an accessor defined from sandbox A is scoped to A's shadow target (that is the
 * DEFAULT behavior, independent of the 0.19.0 change). So:
 *   - B never sees A's getter (containment is the norm for non-live objects), and
 *   - A reads back its own getter from its own shadow.
 * Neither depends on the accessor reaching the raw blue object, so this path is
 * unaffected by the 0.19.0 vs 0.19.1 difference -- it behaves IDENTICALLY on both
 * builds. That contrast is the proof that the regression is liveness-specific:
 *
 *                                   | main (0.19.1) | bad 0.19.0
 *   ------------------------------- | ------------- | ----------
 *   LIVE  obj, B reads A's getter   | 'from-A-getter' | undefined  <- the regression
 *   NON-live obj, B reads A's getter| undefined       | undefined  <- unchanged
 *
 * Values below were characterized on `main` and locked.
 */
function makeSharedObject() {
    return {};
}

describe('cross-sandbox AC6 control: accessor sharing on a NON-live object', () => {
    it('B does NOT see a getter A defined on a shared non-live object (contained to A)', () => {
        expect.assertions(1);

        const shared = makeSharedObject();
        const bRead = capture();

        const a = sandbox({ shared });
        const b = sandbox({ shared, report: bRead.hook });

        a.evaluate(`
            Object.defineProperty(shared, 'sharedGetter', {
                configurable: true,
                get() { return 'from-A-getter'; },
            });
        `);
        b.evaluate(`report(shared.sharedGetter);`);

        // Non-live: accessor stays on A's shadow, never reaches the raw object,
        // so B sees nothing. (LIVE object would give 'from-A-getter' on main.)
        expect(bRead.last).toBe(undefined);
    });

    it('A reads back a getter it defined on a shared non-live object (from its own shadow)', () => {
        expect.assertions(1);

        const shared = makeSharedObject();
        const aRead = capture();

        const a = sandbox({ shared, report: aRead.hook });

        a.evaluate(`
            Object.defineProperty(shared, 'own', {
                configurable: true,
                get() { return 'defined-in-A'; },
            });
            report(shared.own);
        `);

        // Non-live reads resolve against the shadow the accessor was defined on,
        // so A always reads its own getter -- on both builds.
        expect(aRead.last).toBe('defined-in-A');
    });

    it('B does NOT see a data expando A set on a shared non-live object (contained to A)', () => {
        expect.assertions(1);

        const shared = makeSharedObject();
        const bRead = capture();

        const a = sandbox({ shared });
        const b = sandbox({ shared, report: bRead.hook });

        a.evaluate(`shared.dataExpando = 'from-A-data';`);
        b.evaluate(`report(shared.dataExpando);`);

        // Contained, same as the S2 data-writeback isolation result.
        expect(bRead.last).toBe(undefined);
    });
});
