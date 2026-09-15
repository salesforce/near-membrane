import { makeSandboxes } from './__util__/harness.js';

/**
 * AC3 -- error boundary across the double membrane (red-A -> blue -> red-B).
 *
 * An error thrown in one sandbox and caught in another crosses both membranes:
 * the message is preserved and the error is re-branded as an instance of the
 * CATCHING realm's Error/TypeError (cross-realm instanceof works because the
 * membrane re-wraps against the reader's intrinsics). Values locked to observed
 * `main` behavior; both directions and a rethrow round-trip compose cleanly.
 */
describe('cross-sandbox: error boundary across two membranes', () => {
    it("A throws Error, B catches it as B's Error with message + stack intact", () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const boom = a.evaluate('() => { throw new Error("boom-A"); }');
        const callInB = b.evaluate(`(fn) => {
            try { fn(); return 'no-throw'; }
            catch (e) { return 'msg=' + e.message + '|name=' + e.name + '|isError=' + (e instanceof Error) + '|hasStack=' + (typeof e.stack === 'string'); }
        }`);
        expect(callInB(boom)).toBe('msg=boom-A|name=Error|isError=true|hasStack=true');
    });

    it('A throws a TypeError, B catches it preserving the subclass brand', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const boom = a.evaluate('() => { throw new TypeError("type-A"); }');
        const callInB = b.evaluate(`(fn) => {
            try { fn(); return 'no-throw'; }
            catch (e) { return 'msg=' + e.message + '|isTypeError=' + (e instanceof TypeError) + '|isError=' + (e instanceof Error) + '|ctor=' + e.constructor.name; }
        }`);
        expect(callInB(boom)).toBe('msg=type-A|isTypeError=true|isError=true|ctor=TypeError');
    });

    it('reverse: a B callback that throws is caught by the A function that invokes it', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const runInA = a.evaluate(`(cb) => {
            try { cb(); return 'no-throw'; }
            catch (e) { return 'A-caught:' + e.message + '|isError=' + (e instanceof Error); }
        }`);
        const throwingCb = b.evaluate('() => { throw new Error("boom-B"); }');
        expect(runInA(throwingCb)).toBe('A-caught:boom-B|isError=true');
    });

    it('A->B->A round-trip: B rethrows a wrapped error that A observes', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const boom = a.evaluate('() => { throw new Error("origin-A"); }');
        const rethrowInB = b.evaluate(`(fn) => () => {
            try { fn(); }
            catch (e) { throw new Error('wrapped-by-B:' + e.message); }
        }`);
        const wrapped = rethrowInB(boom);
        const observeInA = a.evaluate(`(fn) => {
            try { fn(); return 'no-throw'; }
            catch (e) { return 'A-observes:' + e.message + '|isError=' + (e instanceof Error); }
        }`);
        expect(observeInA(wrapped)).toBe('A-observes:wrapped-by-B:origin-A|isError=true');
    });
});
