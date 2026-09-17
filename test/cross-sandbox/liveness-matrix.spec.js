import { sandbox, capture } from './__util__/harness.js';

/**
 * Liveness property-type matrix.
 *
 * On a shared LIVE object (marked `@@lockerLiveValue`, endowed as the same raw
 * target into A and B), sandbox A defines a property of some descriptor SHAPE and
 * B observes it (or vice-versa). This maps which shapes propagate across the two
 * membranes and pins the full blast radius of the PRB-0031933 regression.
 *
 * Values below are locked to `main` (0.19.1). Each case is annotated with what the
 * bad 0.19.0 build ("Scope defineProperty accessors on live targets to the shadow
 * target", commit 047b873) does, established by swapping
 * `packages/near-membrane-base/src/membrane.ts` to 2d38fa6 and re-running:
 *
 *   - EVERY data-property shape is IDENTICAL on both builds (regression untouched).
 *   - EVERY accessor shape breaks on 0.19.0 -- not just the plain getter (AC6):
 *       * getter -> reads undefined
 *       * setter -> never fires (side effect silently dropped)
 *       * symbol-keyed accessor -> same break (symbols not special-cased)
 *       * non-configurable accessor -> THROWS a TypeError at define time
 *       * getOwnPropertyDescriptor from B -> accessor is wholly invisible
 *       * reverse direction (B defines, A reads) -> also breaks
 *       * redefine data->accessor -> contained; the reader keeps the STALE data
 *   These accessor cases double as regression witnesses.
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

// Two sandboxes over the SAME raw live object; `report` captures observables.
function pair() {
    const shared = makeSharedLiveObject();
    const aCap = capture();
    const bCap = capture();
    const a = sandbox({ shared, report: aCap.hook }, { liveTargetCallback });
    const b = sandbox({ shared, report: bCap.hook }, { liveTargetCallback });
    return { shared, a, b, aCap, bCap };
}

describe('liveness matrix: data-property shapes (A defines -> B observes)', () => {
    // Data descriptors are passthru on live targets -> land on the raw object ->
    // visible to B. Unaffected by the 0.19.0 change (identical on both builds).
    it('data writable propagates to B', () => {
        expect.assertions(1);
        const { a, b, bCap } = pair();
        a.evaluate(
            `Object.defineProperty(shared, 'p', { value: 'val-A', writable: true, configurable: true, enumerable: true });`
        );
        b.evaluate(`report(String(shared.p));`);
        expect(bCap.last).toBe('val-A');
    });

    it('data non-writable propagates to B', () => {
        expect.assertions(1);
        const { a, b, bCap } = pair();
        a.evaluate(
            `Object.defineProperty(shared, 'p', { value: 'val-A', writable: false, configurable: true });`
        );
        b.evaluate(`report(String(shared.p));`);
        expect(bCap.last).toBe('val-A');
    });

    it('data non-enumerable propagates to B with enumerability preserved', () => {
        expect.assertions(1);
        const { a, b, bCap } = pair();
        a.evaluate(
            `Object.defineProperty(shared, 'p', { value: 'val-A', enumerable: false, configurable: true });`
        );
        b.evaluate(
            `report(String(shared.p) + '|enum=' + shared.propertyIsEnumerable('p') + '|keys=' + Object.keys(shared).includes('p'));`
        );
        expect(bCap.last).toBe('val-A|enum=false|keys=false');
    });

    it('data non-configurable propagates to B', () => {
        expect.assertions(1);
        const { a, b, bCap } = pair();
        a.evaluate(`Object.defineProperty(shared, 'p', { value: 'val-A', configurable: false });`);
        b.evaluate(`report(String(shared.p));`);
        expect(bCap.last).toBe('val-A');
    });

    it('assignment expando propagates to B', () => {
        expect.assertions(1);
        const { a, b, bCap } = pair();
        a.evaluate(`shared.p = 'val-A';`);
        b.evaluate(`report(String(shared.p));`);
        expect(bCap.last).toBe('val-A');
    });

    it('symbol-keyed data (registry symbol) propagates to B', () => {
        expect.assertions(1);
        const { a, b, bCap } = pair();
        a.evaluate(`shared[Symbol.for('cross-key')] = 'val-A';`);
        b.evaluate(`report(String(shared[Symbol.for('cross-key')]));`);
        expect(bCap.last).toBe('val-A');
    });
});

describe('liveness matrix: accessor-property shapes (A defines -> B observes)', () => {
    // Accessor descriptors are passthru on live targets on `main` -> land on the
    // raw object -> visible/active for B. On the bad 0.19.0 build they were scoped
    // to A's shadow instead; each assertion below flags what 0.19.0 does.
    it('getter propagates to B', () => {
        expect.assertions(1);
        const { a, b, bCap } = pair();
        a.evaluate(
            `Object.defineProperty(shared, 'p', { configurable: true, get() { return 'got-A'; } });`
        );
        b.evaluate(`report(String(shared.p));`);
        // 0.19.0: undefined.
        expect(bCap.last).toBe('got-A');
    });

    it("setter fires on B's write (side effect crosses to A)", () => {
        expect.assertions(1);
        const { a, b, aCap } = pair();
        a.evaluate(
            `Object.defineProperty(shared, 'p', { configurable: true, set(v) { report('setter-saw:' + v); } });`
        );
        b.evaluate(`shared.p = 'from-B';`);
        // 0.19.0: setter never fires -> aCap.last stays undefined (silent drop).
        expect(aCap.last).toBe('setter-saw:from-B');
    });

    it('getter+setter both work across the two membranes', () => {
        expect.assertions(1);
        const { a, b, aCap, bCap } = pair();
        a.evaluate(
            `Object.defineProperty(shared, 'p', { configurable: true, get() { return 'got-A'; }, set(v) { report('setter-saw:' + v); } });`
        );
        b.evaluate(`report('read=' + String(shared.p)); shared.p = 'from-B';`);
        // 0.19.0: 'read=undefined :: undefined'.
        expect(`${bCap.last} :: ${aCap.last}`).toBe('read=got-A :: setter-saw:from-B');
    });

    it('symbol-keyed getter (registry symbol) propagates to B', () => {
        expect.assertions(1);
        const { a, b, bCap } = pair();
        a.evaluate(
            `Object.defineProperty(shared, Symbol.for('cross-getter'), { configurable: true, get() { return 'got-A'; } });`
        );
        b.evaluate(`report(String(shared[Symbol.for('cross-getter')]));`);
        // 0.19.0: undefined (symbol keys are not special-cased).
        expect(bCap.last).toBe('got-A');
    });

    it('non-configurable getter propagates to B (and does not throw at define time)', () => {
        expect.assertions(1);
        const { a, b, bCap } = pair();
        // 0.19.0: A's defineProperty THROWS a TypeError -- the shadow-scoping
        // violates the proxy non-configurable invariant against the raw target.
        a.evaluate(
            `Object.defineProperty(shared, 'p', { configurable: false, get() { return 'got-A'; } });`
        );
        b.evaluate(`report(String(shared.p));`);
        expect(bCap.last).toBe('got-A');
    });

    it('B can introspect the accessor descriptor A defined', () => {
        expect.assertions(1);
        const { a, b, bCap } = pair();
        a.evaluate(
            `Object.defineProperty(shared, 'p', { configurable: true, get() { return 'got-A'; } });`
        );
        b.evaluate(`
            const d = Object.getOwnPropertyDescriptor(shared, 'p');
            report(d ? ('hasGet=' + (typeof d.get === 'function') + '|hasValue=' + ('value' in d)) : 'no-descriptor');
        `);
        // 0.19.0: 'no-descriptor' -- the accessor is wholly invisible to B.
        expect(bCap.last).toBe('hasGet=true|hasValue=false');
    });
});

describe('liveness matrix: reverse direction + mutation (B defines / deletes -> A observes)', () => {
    it('reverse data: B defines, A reads (propagates)', () => {
        expect.assertions(1);
        const { a, b, aCap } = pair();
        b.evaluate(
            `Object.defineProperty(shared, 'p', { value: 'val-B', writable: true, configurable: true });`
        );
        a.evaluate(`report(String(shared.p));`);
        // Data: identical on both builds.
        expect(aCap.last).toBe('val-B');
    });

    it('reverse accessor: B defines getter, A reads (propagates)', () => {
        expect.assertions(1);
        const { a, b, aCap } = pair();
        b.evaluate(
            `Object.defineProperty(shared, 'p', { configurable: true, get() { return 'got-B'; } });`
        );
        a.evaluate(`report(String(shared.p));`);
        // 0.19.0: undefined -- the break is direction-agnostic.
        expect(aCap.last).toBe('got-B');
    });

    it('delete: A defines data, B deletes, A observes the deletion', () => {
        expect.assertions(1);
        const { a, b, aCap } = pair();
        a.evaluate(`shared.p = 'val-A';`);
        b.evaluate(`delete shared.p;`);
        a.evaluate(`report('has=' + ('p' in shared) + '|val=' + String(shared.p));`);
        // Delete of a data property: identical on both builds.
        expect(aCap.last).toBe('has=false|val=undefined');
    });

    it("redefine data->accessor: B redefines A's data as a getter, A reads B's getter", () => {
        expect.assertions(1);
        const { a, b, aCap } = pair();
        a.evaluate(`shared.p = 'val-A';`);
        b.evaluate(
            `Object.defineProperty(shared, 'p', { configurable: true, get() { return 'got-B'; } });`
        );
        a.evaluate(`report(String(shared.p));`);
        // 0.19.0: 'val-A' -- B's accessor is contained, so A reads the STALE data.
        expect(aCap.last).toBe('got-B');
    });
});
