import { sandbox } from './__util__/harness.js';

/**
 * Tier-2 -- error / rejection identity across the double membrane
 * (red-A -> blue -> red-B).
 *
 * Adapts the RICHER cases from `test/membrane/errors.spec.js` (single blue<->red
 * crossing) to the sibling-sandbox double crossing. This COMPLEMENTS, and does not
 * duplicate, `error-boundary.spec.js` (which locks re-branding of thrown Errors to
 * the catching realm's Error/TypeError, instanceof, and stack presence). The cases
 * here that error-boundary does not cover:
 *   - a thrown value's IDENTITY is preserved across two hops (same proxy on the
 *     far side as the relayed object),
 *   - NON-Error plain objects and NULL-PROTOTYPE objects thrown across the hop,
 *   - an Error SUBCLASS carrying a getter + own data property,
 *   - rejection reasons via `.catch` and via the `unhandledrejection` event,
 *   - the reverse direction (a value thrown in B, caught in A).
 *
 * Values locked to observed behavior on `main` (HEAD).
 */

// Suppress Jasmine's built-in unhandled-rejection handling during the
// unhandledrejection test (mirrors test/membrane/errors.spec.js).
const onerrorHandler = (function (originalOnError) {
    return function onerror(...args) {
        const { 0: message } = args;
        if (!String(message).startsWith('Unhandled promise rejection:')) {
            Reflect.apply(originalOnError, globalThis, args);
        }
    };
})(globalThis.onerror);

describe('cross-sandbox errors: value thrown in A, caught in B (A->B)', () => {
    it('a NON-error plain object thrown by an A function keeps identity + own props in B, no synthesized message', () => {
        expect.assertions(1);
        const a = sandbox();
        a.evaluate(
            'globalThis.errObj = { foo: "bar" }; globalThis.throwIt = function () { throw errObj; };'
        );
        const throwIt = a.evaluate('throwIt');
        const errObj = a.evaluate('errObj');
        const b = sandbox({ throwIt, errObj });

        const result = b.evaluate(`(() => {
            try { throwIt(); return 'no-throw'; }
            catch (e) { return [e === errObj, e.foo, typeof e.message].join('|'); }
        })()`);
        // Same underlying A object relayed two ways (endowment + throw) -> one B proxy.
        expect(result).toBe('true|bar|undefined');
    });

    it('a NULL-PROTOTYPE object thrown by an A function keeps null proto + own prop in B', () => {
        expect.assertions(1);
        const a = sandbox();
        a.evaluate(
            'globalThis.throwNull = function () { throw Object.create(null, { foo: { value: "bar" } }); };'
        );
        const throwNull = a.evaluate('throwNull');
        const b = sandbox({ throwNull });

        const result = b.evaluate(`(() => {
            try { throwNull(); return 'no-throw'; }
            catch (e) { return [Reflect.getPrototypeOf(e) === null, e.foo, typeof e.message].join('|'); }
        })()`);
        expect(result).toBe('true|bar|undefined');
    });

    it('an Error SUBCLASS (getter + own prop) thrown by A preserves getter/prop/message and instanceof in B', () => {
        expect.assertions(1);
        const a = sandbox();
        a.evaluate(`
            class CustomError extends Error {
                constructor(message) { super(message); this.bar = 'baz'; }
                get foo() { return 'bar'; }
            }
            globalThis.CustomError = CustomError;
            globalThis.throwCustom = function () { throw new CustomError('boom'); };
        `);
        const throwCustom = a.evaluate('throwCustom');
        const CustomError = a.evaluate('CustomError');
        const b = sandbox({ throwCustom, CustomError });

        const result = b.evaluate(`(() => {
            try { throwCustom(); return 'no-throw'; }
            catch (e) {
                return [e.foo, e.bar, e.message, e instanceof Error, e instanceof CustomError].join('|');
            }
        })()`);
        expect(result).toBe('bar|baz|boom|true|true');
    });

    it("a plain Error thrown by A is re-branded to B's own Error (constructor identity is B's)", () => {
        expect.assertions(1);
        const a = sandbox();
        a.evaluate('globalThis.throwErr = function () { throw new Error("boom"); };');
        const throwErr = a.evaluate('throwErr');
        const b = sandbox({ throwErr });

        const result = b.evaluate(`(() => {
            try { throwErr(); return 'no-throw'; }
            catch (e) {
                return [e instanceof Error, e.message, e.name, e.constructor === Error].join('|');
            }
        })()`);
        expect(result).toBe('true|boom|Error|true');
    });
});

describe('cross-sandbox errors: rejection reasons relayed A->B', () => {
    it('.catch in B on an A promise rejected with a non-Error reason preserves identity + props', (done) => {
        expect.assertions(1);
        const a = sandbox();
        a.evaluate(
            'globalThis.errObj = { foo: "bar" }; globalThis.p = new Promise((resolve, reject) => { reject(errObj); });'
        );
        const p = a.evaluate('p');
        const errObj = a.evaluate('errObj');
        const results = [];
        const report = (s) => {
            results.push(s);
        };
        const b = sandbox({ p, errObj, report });

        b.evaluate('p.catch((e) => report([e === errObj, e.foo, typeof e.message].join("|")));');

        setTimeout(() => {
            expect(results[0]).toBe('true|bar|undefined');
            done();
        }, 0);
    });

    it('the unhandledrejection event on the host observes an A rejection reason with props intact', (done) => {
        expect.assertions(2);
        const originalOnError = globalThis.onerror;
        globalThis.onerror = onerrorHandler;
        const a = sandbox();
        a.evaluate('globalThis.errObj = { foo: "bar" };');

        function handler(event) {
            window.removeEventListener('unhandledrejection', handler);
            event.preventDefault();
            const { reason } = event;
            globalThis.onerror = originalOnError;
            expect(reason.foo).toBe('bar');
            expect(typeof reason.message).toBe('undefined');
            done();
        }
        window.addEventListener('unhandledrejection', handler);

        a.evaluate('new Promise((resolve, reject) => { reject(errObj); });');
    });
});

describe('cross-sandbox errors: reverse direction (value thrown in B, caught in A)', () => {
    it('a NON-error plain object thrown by a B function keeps own props in A, no synthesized message', () => {
        expect.assertions(1);
        const b = sandbox();
        b.evaluate('globalThis.throwIt = function () { throw { foo: "bar" }; };');
        const throwIt = b.evaluate('throwIt');
        const a = sandbox({ throwIt });

        const result = a.evaluate(`(() => {
            try { throwIt(); return 'no-throw'; }
            catch (e) { return [e.foo, typeof e.message].join('|'); }
        })()`);
        expect(result).toBe('bar|undefined');
    });
});
