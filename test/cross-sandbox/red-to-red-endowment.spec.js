import { sandbox } from './__util__/harness.js';

/**
 * AC3 -- red-A value injected DIRECTLY into red-B via ENDOWMENTS.
 *
 * Every other cross-sandbox spec relays the A object as a call ARGUMENT into a
 * B-lifted function. This spec exercises the other injection path: a value created
 * in red-A and returned ("exported") from `a.evaluate(...)` is installed into red-B
 * at construction time as an endowment (descriptor-based global install), then used
 * from inside B. Still a red-A -> blue -> red-B double crossing, but through the
 * endowment machinery rather than argument marshalling.
 *
 * Values locked to `main` (HEAD). Confirms the endowment path matches the
 * argument-passing relay for: confused-deputy authority, plain-object write
 * containment, and Array write liveness (the object-kind-dependent finding).
 */
describe('cross-sandbox endowment: A function -> B', () => {
    it('A function endowed into B is callable; authority follows the caller argument (confused deputy)', () => {
        expect.assertions(1);
        const a = sandbox({});
        // readProp is a generic accessor authored in A, exported and endowed into B.
        const readProp = a.evaluate('(function readProp(o, k) { return o[k]; })');
        const b = sandbox({ readProp });

        // B calls A's function on a B-owned object -> the result reflects B's own
        // data. A's generic function does not exercise A's ambient authority; the
        // value follows the ARGUMENT the caller supplies.
        const result = b.evaluate(
            'typeof readProp + "|" + readProp({ secret: "B-secret" }, "secret")'
        );
        expect(result).toBe('function|B-secret');
    });

    it("A function endowed into B runs in A's realm, exposing only its return (closure stays private)", () => {
        expect.assertions(1);
        const a = sandbox({});
        // A closure over A-private state; only the returned value crosses to B.
        const getSecret = a.evaluate(
            '(() => { const secret = "A-secret"; return () => secret; })()'
        );
        const b = sandbox({ getSecret });

        // B gets the returned value but cannot see the closed-over binding.
        const result = b.evaluate('getSecret() + "|" + typeof secret');
        expect(result).toBe('A-secret|undefined');
    });

    it('round-trip: B passes a B object to an A function; B observes the return, A-side mutation is contained', () => {
        expect.assertions(1);
        const a = sandbox({});
        const tagIt = a.evaluate(
            '(function tagIt(o) { o.tag = "A-tag"; return "A-saw:" + o.v + "+" + o.tag; })'
        );
        const b = sandbox({ tagIt });

        // B hands a B-owned plain object to A; A mutates it (in A's realm) and reports.
        // A sees its own write; B does NOT (plain-object writes are contained to the
        // writer's side -- symmetric to the s2 finding, now A-as-writer).
        const result = b.evaluate(`
            const o = { v: "B" };
            const returned = tagIt(o);
            returned + " :: B-after:" + (o.tag === undefined ? "no-tag" : o.tag);
        `);
        expect(result).toBe('A-saw:B+A-tag :: B-after:no-tag');
    });
});

describe('cross-sandbox endowment: A object / array -> B', () => {
    it('A object endowed into B: B reads data + calls method; B write is contained (plain object)', () => {
        expect.assertions(1);
        const a = sandbox({});
        a.evaluate('globalThis.__o = { data: "A-data", getData() { return this.data; } };');
        const aObj = a.evaluate('__o');
        const aReadData = a.evaluate('(function () { return __o.data; })');
        const b = sandbox({ aObj });

        const bView = b.evaluate('aObj.data + "|" + aObj.getData()');
        b.evaluate('aObj.data = "B-data";');

        // B's write stays on B's shadow; A still reads its own value.
        expect(`${bView} :: A-after:${aReadData()}`).toBe('A-data|A-data :: A-after:A-data');
    });

    it('A array endowed into B: B mutation is LIVE (A observes push + index write)', () => {
        expect.assertions(1);
        const a = sandbox({});
        a.evaluate('globalThis.__a = [1, 2, 3];');
        const aArr = a.evaluate('__a');
        const aReadArr = a.evaluate('(function () { return __a.join(","); })');
        const b = sandbox({ aArr });

        b.evaluate('aArr.push(4); aArr[0] = 99;');

        // Exotic Array target: index/length writes propagate back to A (live),
        // unlike the plain-object case above.
        expect(aReadArr()).toBe('99,2,3,4');
    });
});

describe('cross-sandbox endowment: B value -> A (reverse direction)', () => {
    it('B function endowed into A is callable from A with correct marshalling', () => {
        expect.assertions(1);
        const b = sandbox({});
        const bFn = b.evaluate('(function (x) { return "B-fn:" + x; })');
        const a = sandbox({ bFn });

        expect(a.evaluate('bFn("hi")')).toBe('B-fn:hi');
    });
});
