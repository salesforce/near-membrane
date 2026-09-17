import { makeSandboxes } from './__util__/harness.js';

/**
 * AC3 behavior class: proxy invariants across the double membrane
 * (red-A -> blue -> red-B).
 *
 * The ES Proxy specification enforces invariants around non-configurable /
 * non-writable properties and frozen objects. A double-wrapped object must still
 * honor them from B's side: a non-configurable, non-writable property A defines
 * must read consistently in B and reject redefinition/deletion/writes; a frozen
 * array's shape must be reported consistently. We pin the observed behavior.
 * AC4: A->B (B reads/attempts to mutate A's locked shape).
 *
 * Values locked to `main`.
 */
describe('cross-sandbox invariants: non-configurable non-writable property (A->B)', () => {
    it('CHARACTERIZE: B reads a non-configurable non-writable property from A', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const objFromA = a.evaluate(`
            (() => {
                const o = {};
                Object.defineProperty(o, 'locked', {
                    value: 'v', writable: false, configurable: false, enumerable: true,
                });
                return o;
            })()
        `);
        const probe = b.evaluate(`(o) => {
            const d = Object.getOwnPropertyDescriptor(o, 'locked');
            return 'val=' + o.locked + '|w=' + d.writable + '|c=' + d.configurable;
        }`);
        // The non-writable/non-configurable descriptor is reported faithfully to B.
        expect(probe(objFromA)).toBe('val=v|w=false|c=false');
    });

    it('CHARACTERIZE: B cannot redefine a non-configurable property from A', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const objFromA = a.evaluate(`
            (() => {
                const o = {};
                Object.defineProperty(o, 'locked', {
                    value: 'v', writable: false, configurable: false, enumerable: true,
                });
                return o;
            })()
        `);
        const probe = b.evaluate(`(o) => {
            try {
                Object.defineProperty(o, 'locked', { value: 'x', configurable: true });
                return 'redefined:' + o.locked;
            } catch (e) { return e.name; }
        }`);
        // Redefining a non-configurable property is rejected across the membrane.
        expect(probe(objFromA)).toBe('TypeError');
    });

    it('B (sloppy) write and delete on a locked property from A are no-ops (value survives)', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const objFromA = a.evaluate(`
            (() => {
                const o = {};
                Object.defineProperty(o, 'locked', {
                    value: 'v', writable: false, configurable: false, enumerable: true,
                });
                return o;
            })()
        `);
        // env.evaluate runs sloppy: writing a non-writable / deleting a
        // non-configurable property silently fails rather than throwing. Either
        // way the invariant holds -- the value is unchanged and the key remains.
        const probe = b.evaluate(`(o) => {
            let write, del;
            try { o.locked = 'x'; write = 'wrote:' + o.locked; }
            catch (e) { write = 'write-' + e.name; }
            try { del = 'delete:' + (delete o.locked); }
            catch (e) { del = 'del-' + e.name; }
            return write + '|' + del;
        }`);
        expect(probe(objFromA)).toBe('wrote:v|delete:false');
    });
});

describe('cross-sandbox invariants: frozen array (A->B)', () => {
    it('B observes a frozen array from A as frozen and cannot grow it', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const frozenFromA = a.evaluate('Object.freeze([1, 2, 3])');
        const probe = b.evaluate(`(arr) => {
            const frozen = Object.isFrozen(arr);
            let push;
            try { arr.push(4); push = 'pushed:len=' + arr.length; }
            catch (e) { push = 'push-' + e.name; }
            return 'frozen=' + frozen + '|len=' + arr.length + '|' + push;
        }`);
        // Frozen-ness is reported to B, and push against the non-writable length throws.
        expect(probe(frozenFromA)).toBe('frozen=true|len=3|push-TypeError');
    });
});
