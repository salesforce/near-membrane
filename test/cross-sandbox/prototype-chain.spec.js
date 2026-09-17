import { makeSandboxes } from './__util__/harness.js';

/**
 * AC3 behavior class: prototype chain / setPrototypeOf isolation across the
 * double membrane (red-A -> blue -> red-B).
 *
 * An object minted in A whose behavior lives on its prototype is relayed to B; we
 * pin (1) that inherited methods run with correct `this` and marshalled results
 * when invoked from B, (2) what B sees for `getPrototypeOf` of an A object, and
 * (3) whether a `setPrototypeOf` performed by B leaks back to A (isolation).
 * AC4: covers A->B (method call, proto read) and A->B->A (B mutates proto, A reads).
 *
 * Values locked to `main`.
 */
describe('cross-sandbox prototype chain: inherited method invocation (A->B)', () => {
    it("B invokes an inherited method defined on A's prototype, with correct `this`", () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const objFromA = a.evaluate(`
            (() => {
                const proto = { greet() { return 'hi:' + this.tag; } };
                const o = Object.create(proto);
                o.tag = 'A';
                return o;
            })()
        `);
        const callGreet = b.evaluate('(o) => o.greet()');
        // A's inherited method runs, `this` binds to the relayed receiver, result marshalled back.
        expect(callGreet(objFromA)).toBe('hi:A');
    });

    it('B reads the prototype of an A object as a marshalled proto proxy (not Object.prototype)', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const objFromA = a.evaluate(`
            (() => {
                const proto = { greet() { return 'x'; } };
                const o = Object.create(proto);
                return o;
            })()
        `);
        const readProto = b.evaluate(`(o) => {
            const p = Object.getPrototypeOf(o);
            if (p === null) return 'null';
            return 'greet=' + typeof p.greet + '|isObjProto=' + (p === Object.prototype);
        }`);
        // B sees A's custom prototype (its `greet` is a marshalled function), distinct from B's Object.prototype.
        expect(readProto(objFromA)).toBe('greet=function|isObjProto=false');
    });
});

describe('cross-sandbox prototype chain: setPrototypeOf isolation (A->B->A)', () => {
    it("B's setPrototypeOf reports success but does NOT propagate to A (proto mutation isolated)", () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const objFromA = a.evaluate('({ tag: "A" })');

        const bSet = b.evaluate(`(o) => {
            try {
                Object.setPrototypeOf(o, { injected() { return 'from-B'; } });
                return 'set-ok';
            } catch (e) { return 'threw:' + e.name; }
        }`);
        const aObserve = a.evaluate(`(o) => {
            const p = Object.getPrototypeOf(o);
            if (p === Object.prototype) return 'Object.prototype';
            if (p === null) return 'null';
            return 'injected=' + typeof (p && p.injected);
        }`);

        const bResult = bSet(objFromA);
        const aView = aObserve(objFromA);
        // NOTE (divergence from single-crossing liveness): B's setPrototypeOf
        // returns truthy ('set-ok') but A's prototype is unchanged -- the proto
        // swap is contained to B's side and never reaches the originating realm.
        expect(`${bResult} :: ${aView}`).toBe('set-ok :: Object.prototype');
    });
});
