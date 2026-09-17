import { sandbox, capture } from './__util__/harness.js';

/**
 * AC6 -- Regression repro for PRB-0031933: cross-namespace getter sharing on a
 * shared LIVE object.
 *
 * This is the exact behavior the near-membrane 0.19.0 build broke and the 0.19.1
 * revert (commit 1378ad4, reverting the W-23552746 accessor-containment fix
 * 047b873) restored. From the revert message:
 *
 *   "live-target reads resolve against the raw target, so any accessor defined
 *    or re-projected onto a shared live object from the sandbox reads back
 *    undefined. That broke legitimate cross-namespace getter sharing (e.g. an
 *    ISV component sharing a getter into a customer c-namespace component)."
 *
 * A live target (marked with `@@lockerLiveValue`, the marker locker uses in
 * production) has a passthru `defineProperty` trap, so an accessor defined on it
 * from sandbox A lands on the RAW shared object and is therefore visible to
 * sandbox B. The 0.19.0 containment scoped that accessor to A's shadow target,
 * so B (and even A) read back `undefined`.
 *
 * Expected on current `main` (0.19.1): B reads A's getter value.
 * Expected on the bad 0.19.0 build: B reads `undefined` -> this test FAILS,
 * which is the point -- it would have caught the shipped regression.
 */
const LOCKER_LIVE_VALUE_MARKER = Symbol.for('@@lockerLiveValue');

function liveTargetCallback(target) {
    return Object.hasOwn(target, LOCKER_LIVE_VALUE_MARKER);
}

// A single blue object marked live and endowed into both sandboxes as the same
// raw shared target (mirrors an object shared across LWS namespaces).
function makeSharedLiveObject() {
    const shared = {};
    Reflect.defineProperty(shared, LOCKER_LIVE_VALUE_MARKER, {});
    return shared;
}

describe('cross-sandbox AC6: cross-namespace getter sharing (live object)', () => {
    it('B reads a getter that A defined on a shared live object', () => {
        expect.assertions(1);

        const shared = makeSharedLiveObject();
        const bRead = capture();

        const a = sandbox({ shared }, { liveTargetCallback });
        const b = sandbox({ shared, report: bRead.hook }, { liveTargetCallback });

        // A (e.g. an ISV component) defines a getter on the shared live object.
        a.evaluate(`
            Object.defineProperty(shared, 'sharedGetter', {
                configurable: true,
                get() { return 'from-A-getter'; },
            });
        `);

        // B (e.g. a customer c-namespace component) reads it across the membrane.
        b.evaluate(`report(shared.sharedGetter);`);

        // main: 'from-A-getter'. bad 0.19.0: undefined (accessor contained on A's shadow).
        expect(bRead.last).toBe('from-A-getter');
    });

    it('A reads back a getter it defined on a shared live object', () => {
        expect.assertions(1);

        const shared = makeSharedLiveObject();
        const aRead = capture();

        const a = sandbox({ shared, report: aRead.hook }, { liveTargetCallback });

        a.evaluate(`
            Object.defineProperty(shared, 'own', {
                configurable: true,
                get() { return 'defined-in-A'; },
            });
            report(shared.own);
        `);

        // main: 'defined-in-A'. bad 0.19.0: undefined (read resolves against raw target).
        expect(aRead.last).toBe('defined-in-A');
    });

    it('control: a data expando on a shared live object is visible to B (unaffected by the regression)', () => {
        expect.assertions(1);

        const shared = makeSharedLiveObject();
        const bRead = capture();

        const a = sandbox({ shared }, { liveTargetCallback });
        const b = sandbox({ shared, report: bRead.hook }, { liveTargetCallback });

        a.evaluate(`shared.dataExpando = 'from-A-data';`);
        b.evaluate(`report(shared.dataExpando);`);

        expect(bRead.last).toBe('from-A-data');
    });
});
