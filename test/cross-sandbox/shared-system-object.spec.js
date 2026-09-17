import { sandbox } from './__util__/harness.js';

/**
 * Shared system-mode object: blue -> {red-A, red-B}.
 *
 * An object CREATED IN SYSTEM MODE (blue realm = the test itself) is shared into
 * TWO sandboxes (red-A, red-B). Unlike the red-A -> blue -> red-B relay the other
 * cross-sandbox specs exercise, this is two independent SINGLE crossings over the
 * SAME raw blue target: each sandbox holds `redX_proxy(blue_obj)`. That yields
 * THREE observers -- red-A, red-B, and system mode (which reads the raw blue
 * object directly) -- so every mutation asks: where does it land, and who sees it?
 *
 * Locked behavior (characterized on `main`/HEAD):
 *
 *   PLAIN blue object -- red mutations are CONTAINED to that sandbox's shadow.
 *     A write / defineProperty / delete performed by A does not reach the raw blue
 *     object, so NEITHER red-B NOR system mode observes it. The blue host is fully
 *     protected; each sandbox has a private, copy-on-write view. (Stronger than the
 *     S2 red-A->red-B containment: here even the originating blue object is spared.)
 *
 *   LIVE blue object (`@@lockerLiveValue` + `liveTargetCallback`) -- red mutations
 *     PROPAGATE to the raw blue target, so red-B AND system mode both observe them.
 *     This is the opt-in bidirectional channel; it is exactly the channel the bad
 *     near-membrane 0.19.0 build corrupted for accessors (see the "live: A defines
 *     getter" case -- on 0.19.0 both red-B and system mode would read undefined).
 */
const LOCKER_LIVE_VALUE_MARKER = Symbol.for('@@lockerLiveValue');
function liveTargetCallback(target) {
    return Object.hasOwn(target, LOCKER_LIVE_VALUE_MARKER);
}

describe('cross-sandbox: system-mode object shared into two sandboxes (plain)', () => {
    it('both sandboxes and system mode read the same blue value', () => {
        expect.assertions(1);
        const shared = { base: 'blue-base' };
        const a = sandbox({ shared });
        const b = sandbox({ shared });
        const aView = a.evaluate('String(shared.base)');
        const bView = b.evaluate('String(shared.base)');
        expect(`A=${aView}|B=${bView}|SYS=${String(shared.base)}`).toBe(
            'A=blue-base|B=blue-base|SYS=blue-base'
        );
    });

    it("A's data write is contained: neither B nor system mode observes it", () => {
        expect.assertions(1);
        const shared = { base: 'blue-base' };
        const a = sandbox({ shared });
        const b = sandbox({ shared });
        // Does not throw, but lands on A's shadow only.
        a.evaluate(`shared.foo = 'A-foo';`);
        const bView = b.evaluate('String(shared.foo)');
        expect(`B=${bView}|SYS=${String(shared.foo)}`).toBe('B=undefined|SYS=undefined');
    });

    it("A's accessor definition is contained: neither B nor system mode observes it", () => {
        expect.assertions(1);
        const shared = { base: 'blue-base' };
        const a = sandbox({ shared });
        const b = sandbox({ shared });
        a.evaluate(
            `Object.defineProperty(shared, 'acc', { configurable: true, get() { return 'A-getter'; } });`
        );
        const bView = b.evaluate('String(shared.acc)');
        expect(`B=${bView}|SYS=${String(shared.acc)}`).toBe('B=undefined|SYS=undefined');
    });

    it("A's delete is contained: the blue property survives for B and system mode", () => {
        expect.assertions(1);
        const shared = { base: 'blue-base' };
        const a = sandbox({ shared });
        const b = sandbox({ shared });
        a.evaluate(`delete shared.base;`);
        const bView = b.evaluate('String(shared.base)');
        expect(`B=${bView}|SYS=${String(shared.base)}`).toBe('B=blue-base|SYS=blue-base');
    });

    it("A's expando is invisible to both B and system mode (isolation)", () => {
        expect.assertions(1);
        const shared = {};
        const a = sandbox({ shared });
        const b = sandbox({ shared });
        a.evaluate(`shared.expando = 'A-only';`);
        const bHas = b.evaluate(`('expando' in shared)`);
        expect(`Bhas=${bHas}|SYShas=${'expando' in shared}`).toBe('Bhas=false|SYShas=false');
    });
});

describe('cross-sandbox: system-mode object shared into two sandboxes (live)', () => {
    function makeLiveShared(seed = {}) {
        const shared = { ...seed };
        Reflect.defineProperty(shared, LOCKER_LIVE_VALUE_MARKER, {});
        return shared;
    }

    it("A's data write propagates: both B and system mode observe it", () => {
        expect.assertions(1);
        const shared = makeLiveShared();
        const a = sandbox({ shared }, { liveTargetCallback });
        const b = sandbox({ shared }, { liveTargetCallback });
        a.evaluate(`shared.foo = 'A-foo';`);
        const bView = b.evaluate('String(shared.foo)');
        // Contrast with the plain case: here the write reaches the raw blue target.
        expect(`B=${bView}|SYS=${String(shared.foo)}`).toBe('B=A-foo|SYS=A-foo');
    });

    it("A's getter propagates: both B and system mode read A's getter (AC6 shape)", () => {
        expect.assertions(1);
        const shared = makeLiveShared();
        const a = sandbox({ shared }, { liveTargetCallback });
        const b = sandbox({ shared }, { liveTargetCallback });
        a.evaluate(
            `Object.defineProperty(shared, 'acc', { configurable: true, get() { return 'A-getter'; } });`
        );
        const bView = b.evaluate('String(shared.acc)');
        // On the bad 0.19.0 build both would read 'undefined' (accessor contained).
        expect(`B=${bView}|SYS=${String(shared.acc)}`).toBe('B=A-getter|SYS=A-getter');
    });
});

describe('cross-sandbox: system-mode function shared into two sandboxes', () => {
    it('runs in blue for both callers and returns correct marshalled results', () => {
        expect.assertions(1);
        let blueCalls = 0;
        const api = {
            add(x, y) {
                blueCalls += 1;
                return x + y;
            },
        };
        const shared = api.add;
        const a = sandbox({ shared });
        const b = sandbox({ shared });
        const aRes = a.evaluate('shared(2, 3)');
        const bRes = b.evaluate('shared(10, 20)');
        // Single blue implementation, invoked once per sandbox; results marshal back.
        expect(`A=${aRes}|B=${bRes}|blueCalls=${blueCalls}`).toBe('A=5|B=30|blueCalls=2');
    });
});
