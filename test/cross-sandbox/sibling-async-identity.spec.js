import { sandbox } from './__util__/harness.js';

/**
 * Tier-3 -- proxy IDENTITY STABILITY across async ticks over the double membrane
 * (red-A -> blue -> red-B). Adapts `test/dom/ffbug.spec.js` (FF BugFix 543435),
 * which pins that a red `document` reference stays `=== document` across the sync
 * turn, a microtask, and a macrotask.
 *
 * The sibling question: when B repeatedly pulls the SAME A object across ticks
 * (via an A accessor relayed into B), does the membrane's identity cache stay
 * stable, so every retrieval is the one-and-the-same B proxy? And does an A promise
 * that settles on a later tick deliver the A value with that same identity? Losing
 * identity across a turn is exactly the class of bug ffbug guards against; here it
 * is guarded across two hops.
 *
 * `keepAlive: true` keeps each sandbox's realm live across turns. Values locked to
 * observed behavior on `main` (HEAD).
 */
describe('cross-sandbox async identity: A object identity stable across ticks in B', () => {
    it('pulling the same A object across sync, microtask, and macrotask ticks yields one identity in B', (done) => {
        expect.assertions(3);
        const a = sandbox({}, { keepAlive: true });
        a.evaluate('globalThis.node = { tag: "A" }; globalThis.getNode = () => node;');
        const getNode = a.evaluate('getNode');
        const results = [];
        const report = (label, same) => {
            results.push(`${label}:${String(same)}`);
        };
        const b = sandbox({ getNode, report }, { keepAlive: true });

        b.evaluate(`
            const first = getNode();
            report('sync', getNode() === first);
            Promise.resolve().then(() => { report('micro', getNode() === first); });
            setTimeout(() => { report('macro', getNode() === first); }, 1);
        `);

        setTimeout(() => {
            expect(results).toContain('sync:true');
            expect(results).toContain('micro:true');
            expect(results).toContain('macro:true');
            done();
        }, 25);
    });

    it('an A promise that settles on a later macrotask delivers the A value to B with stable identity', (done) => {
        expect.assertions(1);
        const a = sandbox({}, { keepAlive: true });
        a.evaluate(`
            globalThis.node = { tag: "A" };
            globalThis.getNode = () => node;
            globalThis.p = new Promise((resolve) => { setTimeout(() => resolve(node), 1); });
        `);
        const p = a.evaluate('p');
        const getNode = a.evaluate('getNode');
        const results = [];
        const report = (v) => {
            results.push(v);
        };
        const b = sandbox({ p, getNode, report }, { keepAlive: true });

        // The value delivered through the resolved A promise must be the same B
        // proxy as a fresh pull of the same A object.
        b.evaluate('p.then((value) => { report(value === getNode()); });');

        setTimeout(() => {
            expect(results[0]).toBe(true);
            done();
        }, 30);
    });

    it('a function relayed A->B keeps one identity across ticks (callable each turn)', (done) => {
        expect.assertions(1);
        const a = sandbox({}, { keepAlive: true });
        a.evaluate('globalThis.fn = () => "A-fn"; globalThis.getFn = () => fn;');
        const getFn = a.evaluate('getFn');
        const results = [];
        const report = (v) => {
            results.push(v);
        };
        const b = sandbox({ getFn, report }, { keepAlive: true });

        b.evaluate(`
            const first = getFn();
            setTimeout(() => {
                const later = getFn();
                report((later === first) + '|' + later());
            }, 1);
        `);

        setTimeout(() => {
            expect(results[0]).toBe('true|A-fn');
            done();
        }, 25);
    });
});
