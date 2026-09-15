import createVirtualEnvironment from '@locker/near-membrane-dom';

/**
 * Exploratory characterization -- a DIRECT A <-> B membrane by NESTING.
 *
 * Every other cross-sandbox spec models the production topology: two SIBLING
 * sandboxes, each a child of the host `window`. There is no A<->B membrane there;
 * an A object reaching B is the double crossing `redB( blue( redA_obj ) )`, and
 * that second hop is what the 0.19.0 accessor regression broke.
 *
 * This file asks the other question: CAN you build a single, direct A<->B
 * membrane? The `@locker/near-membrane-dom` public API can't express sibling
 * sandboxes talking directly -- but its one entry point,
 * `createVirtualEnvironment(globalObject, options)`, treats `globalObject` as the
 * incumbent ("blue") realm and only requires it to be a same-origin window with a
 * `document`. A plain iframe's `contentWindow` qualifies. So if we hand it realm
 * A's window instead of the host window, the sandbox it builds (B) is NESTED
 * inside A: A becomes B's host, and A<->B is a single membrane with nothing in
 * between (B's iframe is even created as a child of A's document).
 *
 * NOTE: this is a hierarchical topology (A hosts B), NOT the production sibling
 * shape (host hosts A and B). It is not how Locker composes namespaces and is not
 * needed for W-24137734 -- it just demonstrates the direct crossing is
 * constructible and characterizes how it behaves. Values are locked to observed
 * behavior on `main` (HEAD).
 *
 * VERIFIED FINDING (W-24137734): on the 0.19.0 bad build, the faithful live-getter
 * case below PASSES across this single direct membrane, while the SIBLING AC6 spec
 * (`ac6-cross-namespace-getter-sharing.spec.js`) FAILS reading `undefined` on the
 * SAME binary. So the 0.19.0 accessor regression is a property of the DOUBLE
 * crossing (the relay hop), not of live accessors as such -- which is why sibling
 * namespaces (Omniscripts/FlexCards) hit it and a nested topology would mask it.
 * FUTURE WORK: dig into why the single crossing survives; kept as a record.
 */

const LIVE = Symbol.for('@@lockerLiveValue');

// Real iframe realms created for `A`; torn down after each test.
const realms = [];

// Stand up a fresh iframe realm to act as the incumbent ("blue"/host) for a
// nested sandbox. Unlike the detached iframe near-membrane makes for a red
// sandbox, this one is a plain, script-enabled, same-origin realm we author in.
function makeRealm() {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    realms.push(iframe);
    return iframe.contentWindow;
}

// Nest a sandbox B directly inside realm A. `authorInA` runs in A's realm to mint
// native-A values; whatever names it assigns on A's globalThis are endowed into B,
// so B reaches them across the single A<->B membrane.
function nest(aRealm, authoredNames, options = {}) {
    const api = { __proto__: null };
    for (const name of authoredNames) {
        api[name] = aRealm[name];
    }
    return createVirtualEnvironment(aRealm, {
        ...options,
        endowments: Object.getOwnPropertyDescriptors(api),
    });
}

describe('nested direct membrane: B hosted by A (single A<->B crossing)', () => {
    afterEach(() => {
        while (realms.length) {
            const iframe = realms.pop();
            if (iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
            }
        }
    });

    it('a function authored in A is callable from nested B across ONE membrane', () => {
        expect.assertions(1);
        const a = makeRealm();
        a.eval('globalThis.add = (x, y) => x + y;');
        const b = nest(a, ['add']);
        expect(b.evaluate('add(2, 3)')).toBe(5);
    });

    it('an accessor authored in A is invoked when read from B (AC6, collapsed to a single crossing)', () => {
        expect.assertions(1);
        const a = makeRealm();
        // The exact shape AC6 shows breaking across TWO membranes on 0.19.0. Across
        // ONE direct membrane the getter simply runs -- ordinary single-crossing
        // accessor semantics, no double-hop for the regression to bite.
        a.eval('globalThis.host = { get answer() { return 42; } };');
        const b = nest(a, ['host']);
        expect(b.evaluate('host.answer')).toBe(42);
    });

    it('a plain-object write from B is CONTAINED; A keeps its own value', () => {
        expect.assertions(1);
        const a = makeRealm();
        a.eval('globalThis.shared = { v: "A" };');
        const b = nest(a, ['shared']);
        // B mutates across the direct membrane and sees its own write locally...
        const bView = b.evaluate('shared.v = "B"; shared.v');
        // ...but A's authoritative object is untouched: without liveness, even a
        // single-crossing red->blue write lands on B's shadow, not on A.
        expect(`bView=${bView} aView=${a.shared.v}`).toBe('bView=B aView=A');
    });

    it('an Array write from B is LIVE; A observes the push (auto-live exotic target)', () => {
        expect.assertions(1);
        const a = makeRealm();
        a.eval('globalThis.list = [1, 2, 3];');
        const b = nest(a, ['list']);
        b.evaluate('list.push(4); list[0] = 99;');
        // Arrays are auto-live on the red side, so index/length writes propagate
        // back to A even here -- object-kind dependent, same as the sibling case.
        expect(a.list.join(',')).toBe('99,2,3,4');
    });

    it("a live-marked plain object from A DOES observe B's write across the single membrane", () => {
        expect.assertions(1);
        const a = makeRealm();
        a.eval(`
            globalThis.liveObj = { v: "A" };
            liveObj[Symbol.for('@@lockerLiveValue')] = true;
        `);
        const b = nest(a, ['liveObj'], {
            liveTargetCallback: (target) => target[LIVE] === true,
        });
        b.evaluate('liveObj.v = "B";');
        // Marked live: the passthru set trap forwards to A's raw target, so A sees
        // B's write. Contrast the plain-object case above (contained).
        expect(a.liveObj.v).toBe('B');
    });

    it('a LIVE object with a getter authored in A is readable from B across the single membrane (faithful AC6)', () => {
        expect.assertions(1);
        const a = makeRealm();
        // The exact AC6 recipe -- a LIVE target carrying an accessor -- but across
        // ONE direct A<->B membrane instead of the sibling double crossing. This is
        // the case the 0.19.0 regression actually targets (accessors on live
        // targets), so it is the honest test of whether nesting dodges the bug.
        // Authored with A's own intrinsics so the object is native to A.
        const liveGetter = new a.Object();
        a.Object.defineProperty(liveGetter, 'answer', {
            get() {
                return 42;
            },
            configurable: true,
            enumerable: true,
        });
        liveGetter[LIVE] = true;
        a.liveGetter = liveGetter;
        const b = nest(a, ['liveGetter'], {
            liveTargetCallback: (target) => target[LIVE] === true,
        });
        expect(b.evaluate('liveGetter.answer')).toBe(42);
    });

    it('the same A object endowed under two names is one identity inside B', () => {
        expect.assertions(1);
        const a = makeRealm();
        a.eval('globalThis.node = { tag: "A" };');
        // Endow the SAME A object under two names and check B sees one proxy.
        const b = createVirtualEnvironment(a, {
            endowments: Object.getOwnPropertyDescriptors({ one: a.node, two: a.node }),
        });
        expect(b.evaluate('one === two')).toBe(true);
    });
});
