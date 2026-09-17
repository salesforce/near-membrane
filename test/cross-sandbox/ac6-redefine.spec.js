import { sandbox, capture } from './__util__/harness.js';

/**
 * "What happens when B redefines a getter that A defined on a shared object?"
 *
 * Flow: A defines accessor `x` (returns 'from-A') on a shared object relayed to
 * both sandboxes; B then redefines `x` (returns 'from-B'); we observe what A reads
 * and what B reads afterward.
 *
 * Two worlds, characterized on `main` and locked:
 *   - LIVE object: defineProperty is passthru, so both writes hit the RAW blue
 *     object; B's redefinition clobbers A's, and A -- reading against the raw
 *     target -- observes B's getter. (Cross-namespace visibility by design.)
 *   - NON-live object: each defineProperty is scoped to that sandbox's shadow, so
 *     A and B each keep their own getter -- fully isolated.
 */
const LOCKER_LIVE_VALUE_MARKER = Symbol.for('@@lockerLiveValue');

function liveTargetCallback(target) {
    return Object.hasOwn(target, LOCKER_LIVE_VALUE_MARKER);
}

function makeSharedLiveObject() {
    const shared = {};
    Reflect.defineProperty(shared, LOCKER_LIVE_VALUE_MARKER, {});
    return shared;
}

describe('cross-sandbox: B redefines a getter A defined (LIVE object)', () => {
    it("B's redefinition lands on the shared raw target, so A observes B's getter", () => {
        expect.assertions(2);

        const shared = makeSharedLiveObject();
        const aRead = capture();
        const bRead = capture();

        const a = sandbox({ shared, report: aRead.hook }, { liveTargetCallback });
        const b = sandbox({ shared, report: bRead.hook }, { liveTargetCallback });

        a.evaluate(`
            Object.defineProperty(shared, 'x', {
                configurable: true,
                get() { return 'from-A'; },
            });
        `);
        b.evaluate(`
            Object.defineProperty(shared, 'x', {
                configurable: true,
                get() { return 'from-B'; },
            });
        `);

        a.evaluate(`report(shared.x);`);
        b.evaluate(`report(shared.x);`);

        // Passthru defineProperty on a live target: B's getter overwrites A's on
        // the raw blue object, and live reads resolve against raw -- so A now sees
        // B's getter too. (On the bad 0.19.0 build both would read undefined,
        // since accessors were scoped to each shadow and reads hit the bare raw.)
        expect(aRead.last).toBe('from-B');
        expect(bRead.last).toBe('from-B');
    });
});

describe('cross-sandbox: B redefines a getter A defined (NON-live object)', () => {
    it('each sandbox keeps its own getter on its own shadow (fully isolated)', () => {
        expect.assertions(2);

        const shared = {};
        const aRead = capture();
        const bRead = capture();

        const a = sandbox({ shared, report: aRead.hook });
        const b = sandbox({ shared, report: bRead.hook });

        a.evaluate(`
            Object.defineProperty(shared, 'x', {
                configurable: true,
                get() { return 'from-A'; },
            });
        `);
        b.evaluate(`
            Object.defineProperty(shared, 'x', {
                configurable: true,
                get() { return 'from-B'; },
            });
        `);

        a.evaluate(`report(shared.x);`);
        b.evaluate(`report(shared.x);`);

        // Non-live: each defineProperty is scoped to that sandbox's shadow, so the
        // two getters never collide. B cannot clobber A. Identical on both builds.
        expect(aRead.last).toBe('from-A');
        expect(bRead.last).toBe('from-B');
    });
});
