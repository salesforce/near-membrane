import { makeSandboxes } from './__util__/harness.js';

/**
 * Cross-sandbox (double membrane) port of the W-23623814 contract.
 *
 * Adapts `test/membrane/set-prototype-of-isolation.spec.js` and
 * `test/dom/live-object-set-prototype-of.spec.js` -- both single-crossing
 * (blue<->red) -- to the sibling topology red-A -> blue -> red-B.
 *
 * W-23623814 scopes `[[SetPrototypeOf]]` on a LIVE target to the shadow target
 * (inert on the raw side) while `set`/`defineProperty`/`deleteProperty` stay full
 * passthru. That "scope-the-trap-to-the-shadow-on-live-targets" mechanism is the
 * SAME shape the 0.19.0 regression (047b873) botched for defineProperty accessors,
 * so the W-24137734 CAR needs the transitive question answered: when a LIVE object
 * minted in red-A is operated on from red-B (across TWO live membranes), does the
 * shadow-scoped setPrototypeOf isolation still hold, or does the second hop
 * re-expose a leak the single-hop fix closed?
 *
 * The shared object is marked live with `@@lockerLiveValue` and BOTH sandboxes are
 * built with a `liveTargetCallback` that honors the marker, so the object is live
 * at the blue<->A membrane AND the blue<->B membrane. Values locked to HEAD.
 */

const MARKER = Symbol.for('@@lockerLiveValue');

function liveTargetCallback(target) {
    return Object.hasOwn(target, MARKER);
}

// Two sibling sandboxes that both treat `@@lockerLiveValue`-marked objects as live.
function liveSandboxes() {
    return makeSandboxes({ liveTargetCallback }, { liveTargetCallback });
}

// Mint an object in red-A and mark it live in A's own realm (matching how the
// single-hop specs mark targets before they cross a membrane).
function mintLive(env, objectExpr) {
    return env.evaluate(`(() => {
        const o = (${objectExpr});
        Object.defineProperty(o, Symbol.for('@@lockerLiveValue'), {});
        return o;
    })()`);
}

describe('cross-sandbox setPrototypeOf isolation on a live A object (A->B)', () => {
    it('B splicing a B-native prototype carrying a secret is inert; A is untouched (Object.setPrototypeOf)', () => {
        expect.assertions(1);
        const { a, b } = liveSandboxes();
        const liveTarget = mintLive(a, '{ own: "own-value" }');

        // B reparents the live A object onto a B-native object carrying a secret.
        const bView = b.evaluate(`(o) => {
            const payload = { INHERITED_SECRET: 'b-native-secret' };
            Object.setPrototypeOf(o, payload);
            return 'bSees=' + (o.INHERITED_SECRET === undefined ? 'inert' : o.INHERITED_SECRET)
                + '|bProtoIsPayload=' + (Object.getPrototypeOf(o) === payload);
        }`)(liveTarget);

        // A's authoritative view: raw prototype unchanged, secret never inherited.
        const aView =
            a.evaluate(`(o) => 'aProtoIsObjectProto=' + (Reflect.getPrototypeOf(o) === Object.prototype)
            + '|aInheritsSecret=' + ('INHERITED_SECRET' in o)
            + '|aOwn=' + o.own`)(liveTarget);

        expect(`${bView} :: ${aView}`).toBe(
            'bSees=inert|bProtoIsPayload=false :: aProtoIsObjectProto=true|aInheritsSecret=false|aOwn=own-value'
        );
    });

    it('B splicing via Reflect.setPrototypeOf returns true but stays inert; A untouched', () => {
        expect.assertions(1);
        const { a, b } = liveSandboxes();
        const liveTarget = mintLive(a, '{}');

        const bView = b.evaluate(`(o) => {
            const payload = { INHERITED_SECRET: 'b-native-secret' };
            const ok = Reflect.setPrototypeOf(o, payload);
            return 'ok=' + ok + '|bSees=' + (o.INHERITED_SECRET === undefined ? 'inert' : o.INHERITED_SECRET);
        }`)(liveTarget);

        const aProtoOk = a.evaluate('(o) => Reflect.getPrototypeOf(o) === Object.prototype')(
            liveTarget
        );

        expect(`${bView}|aProtoUnchanged=${aProtoOk}`).toBe(
            'ok=true|bSees=inert|aProtoUnchanged=true'
        );
    });

    it('B splicing via the __proto__ setter is inert; A untouched', () => {
        expect.assertions(1);
        const { a, b } = liveSandboxes();
        const liveTarget = mintLive(a, '{}');

        const bSees = b.evaluate(`(o) => {
            const payload = { INHERITED_SECRET: 'b-native-secret' };
            // eslint-disable-next-line no-proto
            o.__proto__ = payload;
            return o.INHERITED_SECRET === undefined ? 'inert' : o.INHERITED_SECRET;
        }`)(liveTarget);

        const aProtoOk = a.evaluate('(o) => Reflect.getPrototypeOf(o) === Object.prototype')(
            liveTarget
        );

        expect(`bSees=${bSees}|aProtoUnchanged=${aProtoOk}`).toBe(
            'bSees=inert|aProtoUnchanged=true'
        );
    });

    it("B splicing B's own globalThis onto the live A object does not reparent it", () => {
        expect.assertions(1);
        const { a, b } = liveSandboxes();
        const liveTarget = mintLive(a, '{}');

        const bView = b.evaluate(`(o) => {
            Object.setPrototypeOf(o, globalThis);
            return 'bSeesArray=' + (o.Array === undefined ? 'undefined' : 'LEAK')
                + '|bProtoIsGlobal=' + (Object.getPrototypeOf(o) === globalThis);
        }`)(liveTarget);

        const aProtoOk = a.evaluate('(o) => Reflect.getPrototypeOf(o) === Object.prototype')(
            liveTarget
        );

        expect(`${bView}|aProtoUnchanged=${aProtoOk}`).toBe(
            'bSeesArray=undefined|bProtoIsGlobal=false|aProtoUnchanged=true'
        );
    });

    it('B wiping the live A object prototype to null is inert; A methods survive', () => {
        expect.assertions(1);
        const { a, b } = liveSandboxes();
        // A class instance so there is a real inherited method to strip.
        const liveWidget = mintLive(
            a,
            'new (class Widget { constructor() { this.label = "rendered"; } render() { return this.label; } })()'
        );

        const bView = b.evaluate(`(o) => {
            Object.setPrototypeOf(o, null);
            return 'bRenderType=' + typeof o.render
                + '|bRender=' + (typeof o.render === 'function' ? o.render() : 'n/a');
        }`)(liveWidget);

        const aView = a.evaluate(
            '(o) => "aProtoNotNull=" + (Reflect.getPrototypeOf(o) !== null) + "|aRender=" + o.render()'
        )(liveWidget);

        expect(`${bView}|${aView}`).toBe(
            'bRenderType=function|bRender=rendered|aProtoNotNull=true|aRender=rendered'
        );
    });

    it("getPrototypeOf from B reflects A's raw prototype after a splice attempt", () => {
        expect.assertions(1);
        const { a, b } = liveSandboxes();
        const liveTarget = mintLive(a, '{}');

        const bView = b.evaluate(`(o) => {
            const before = Object.getPrototypeOf(o);
            Object.setPrototypeOf(o, { spliced: true });
            const after = Object.getPrototypeOf(o);
            return 'sameAsBefore=' + (after === before) + '|afterSpliced=' + (after && after.spliced);
        }`)(liveTarget);

        expect(bView).toBe('sameAsBefore=true|afterSpliced=undefined');
    });
});

describe('cross-sandbox: other live traps stay passthru across A->B after a splice attempt', () => {
    it('B set/defineProperty/deleteProperty still reach A once the target is live', () => {
        expect.assertions(1);
        const { a, b } = liveSandboxes();
        const liveTarget = mintLive(a, '{ removable: "gone-soon" }');

        const bView = b.evaluate(`(o) => {
            Object.setPrototypeOf(o, { poison: 1 });
            o.added = 'via-set';
            Object.defineProperty(o, 'defined', { value: 'via-define', enumerable: true, configurable: true });
            delete o.removable;
            return 'bAdded=' + o.added + '|bDefined=' + o.defined + '|bRemovableGone=' + !('removable' in o);
        }`)(liveTarget);

        // A observes every passthru mutation on the raw target.
        const aView = a.evaluate(
            `(o) => 'aAdded=' + o.added + '|aDefined=' + o.defined + '|aRemovableGone=' + !('removable' in o)`
        )(liveTarget);

        expect(`${bView} :: ${aView}`).toBe(
            'bAdded=via-set|bDefined=via-define|bRemovableGone=true :: aAdded=via-set|aDefined=via-define|aRemovableGone=true'
        );
    });
});

describe('cross-sandbox positive control: the splice is NOT inert on a B-native object', () => {
    it('B splicing a prototype onto its own B-native object works normally', () => {
        expect.assertions(1);
        const { b } = liveSandboxes();

        const bView = b.evaluate(`() => {
            const redProto = { INHERITED_SECRET: 'red-native' };
            const redObject = {};
            Object.setPrototypeOf(redObject, redProto);
            return 'sees=' + redObject.INHERITED_SECRET + '|protoIsRedProto=' + (Object.getPrototypeOf(redObject) === redProto);
        }`)();

        expect(bView).toBe('sees=red-native|protoIsRedProto=true');
    });
});
