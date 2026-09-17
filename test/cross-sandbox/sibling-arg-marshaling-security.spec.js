import { sandbox } from './__util__/harness.js';

/**
 * Tier-2 security -- variadic apply/construct arg-marshaling integrity across the
 * DOUBLE membrane (red-A -> blue -> red-B).
 *
 * Adapts the W-23789302 regression from `test/membrane/security.spec.js` to the
 * sibling-sandbox topology. That fix (commit 96f8d90 -- notably the commit
 * IMMEDIATELY BEFORE the 0.19.0 accessor regression 047b873) hardened the variadic
 * apply/construct trap (`createApplyOrConstructTrapForAnyNumberOfArgs`): when a call
 * carries 6+ args the trap marshals them into a combined-args array, and it must
 * populate that array with `[[DefineOwnProperty]]`, not `[[Set]]`. If it used
 * `[[Set]]`, sandboxed code could install an inherited numeric setter on
 * `Array.prototype` that fires mid-marshal and stomps `combinedArgs[0]` (the foreign
 * target pointer) with a later argument's pointer -- redirecting the call to a
 * different callable. The first user arg lands at `combinedArgs[2]`, so a setter on
 * `Array.prototype['2']` copies that arg's pointer over index 0.
 *
 * DOUBLE-MEMBRANE QUESTION: the single-hop test proves one blue<->red crossing
 * resists this. Here the target and the redirect callable are minted in red-A and
 * relayed A -> blue -> red-B; red-B is the attacker (pollutes its OWN
 * `Array.prototype`) and invokes the A-origin target with 6 args. The call flows
 * back red-B -> blue -> red-A, marshaling at each hop. Does the integrity hold when
 * the marshaled callable/args cross TWO membranes?
 *
 * Values locked to observed behavior on `main` (HEAD).
 */
describe('cross-sandbox arg marshaling: B cannot corrupt a 6-arg call to an A target (W-23789302)', () => {
    const NUMERIC_SETTER_KEY = '2';

    afterEach(() => {
        // Defensive: the pollution happens inside sandbox realms (each with its own
        // in-body try/finally), never the top realm -- but scrub here too in case a
        // test body throws before its finally runs.
        delete Array.prototype[NUMERIC_SETTER_KEY];
    });

    it('positive control: a plain 6-arg call to an A target reaches it across the double membrane', () => {
        expect.assertions(1);
        // Non-vacuous guard: proves the 6+-arg variadic path is actually exercised
        // A -> blue -> B (so the negative tests below are not passing for unrelated
        // reasons like the call simply not crossing).
        const a = sandbox({});
        const intended = a.evaluate('(...args) => "intended:" + args.length');
        const b = sandbox({ intended });
        expect(b.evaluate('intended("a", "b", "c", "d", "e", "f")')).toBe('intended:6');
    });

    it('does not redirect a 6-arg call to a different A target when B pollutes Array.prototype', () => {
        expect.assertions(1);
        const a = sandbox({});
        // Two distinct A-origin callables, relayed A -> blue -> B via endowment.
        const intended = a.evaluate('(...args) => "intended:" + args.length');
        const redirect = a.evaluate('() => "REDIRECTED"');
        const b = sandbox({ intended, redirect });

        // B pollutes ITS OWN Array.prototype[2]; setting index 2 of any inheriting
        // array copies the value over index 0. Then B calls the A target with 6 args,
        // passing the A-origin `redirect` as the first user arg (lands at index 2).
        const result = b.evaluate(`
            Object.defineProperty(Array.prototype, '${NUMERIC_SETTER_KEY}', {
                configurable: true,
                set(pointer) {
                    Object.defineProperty(this, '0', { value: pointer, configurable: true });
                    Object.defineProperty(this, '2', { value: 'x', configurable: true });
                },
            });
            try {
                intended(redirect, 'b', 'c', 'd', 'e', 'f');
            } finally {
                delete Array.prototype['${NUMERIC_SETTER_KEY}'];
            }
        `);

        // Integrity holds across both hops: the intended A target ran with 6 args and
        // the call was NOT diverted to `redirect` ('REDIRECTED').
        expect(result).toBe('intended:6');
    });

    it('delivers 6 unmangled arguments to the A target when B pollutes Array.prototype', () => {
        expect.assertions(1);
        const a = sandbox({});
        // A-origin collector reports each arg's identity back; B-origin arg objects
        // cross B -> blue -> A to be read.
        const collect = a.evaluate(
            '(...args) => args.map((x) => (typeof x === "object" && x !== null ? x.tag : x)).join(",")'
        );
        const b = sandbox({ collect });

        const result = b.evaluate(`
            const mk = (t) => ({ tag: t });
            Object.defineProperty(Array.prototype, '${NUMERIC_SETTER_KEY}', {
                configurable: true,
                set(pointer) {
                    Object.defineProperty(this, '0', { value: pointer, configurable: true });
                    Object.defineProperty(this, '2', { value: 'HACKED', configurable: true });
                },
            });
            try {
                collect(mk('a'), mk('b'), mk('c'), mk('d'), mk('e'), mk('f'));
            } finally {
                delete Array.prototype['${NUMERIC_SETTER_KEY}'];
            }
        `);

        // No slot was stomped: all six args arrive intact and in order.
        expect(result).toBe('a,b,c,d,e,f');
    });

    it('does not redirect a 6-arg construct (new) to a different A constructor when B pollutes Array.prototype', () => {
        expect.assertions(1);
        const a = sandbox({});
        // A-origin constructors relayed to B. The construct trap uses the SAME
        // variadic factory as apply, so `new` with 6+ args flows through identical
        // combined-args marshaling (combinedArgs[1] carries newTarget here).
        const Intended = a.evaluate(
            '(function Intended(...args) { this.who = "intended"; this.count = args.length; })'
        );
        const Redirect = a.evaluate('(function Redirect() { this.who = "REDIRECTED"; })');
        const b = sandbox({ Intended, Redirect });

        const result = b.evaluate(`
            Object.defineProperty(Array.prototype, '${NUMERIC_SETTER_KEY}', {
                configurable: true,
                set(pointer) {
                    Object.defineProperty(this, '0', { value: pointer, configurable: true });
                    Object.defineProperty(this, '2', { value: 'x', configurable: true });
                },
            });
            try {
                const instance = new Intended(Redirect, 'b', 'c', 'd', 'e', 'f');
                instance.who + ':' + instance.count;
            } finally {
                delete Array.prototype['${NUMERIC_SETTER_KEY}'];
            }
        `);

        // Construction was NOT diverted to `Redirect`: the intended constructor ran
        // with its six args across the double membrane.
        expect(result).toBe('intended:6');
    });
});

describe('cross-sandbox arg marshaling: reverse direction (A attacks a B target)', () => {
    const NUMERIC_SETTER_KEY = '2';

    afterEach(() => {
        delete Array.prototype[NUMERIC_SETTER_KEY];
    });

    it('does not redirect a 6-arg call to a different B target when A pollutes Array.prototype', () => {
        expect.assertions(1);
        // Symmetric: the target/redirect are minted in B, relayed B -> blue -> A, and
        // A is the attacker. Confirms the integrity is direction-agnostic.
        const b = sandbox({});
        const target = b.evaluate('(...args) => "target:" + args.length');
        const other = b.evaluate('() => "REDIRECTED"');
        const a = sandbox({ target, other });

        const result = a.evaluate(`
            Object.defineProperty(Array.prototype, '${NUMERIC_SETTER_KEY}', {
                configurable: true,
                set(pointer) {
                    Object.defineProperty(this, '0', { value: pointer, configurable: true });
                    Object.defineProperty(this, '2', { value: 'x', configurable: true });
                },
            });
            try {
                target(other, 'b', 'c', 'd', 'e', 'f');
            } finally {
                delete Array.prototype['${NUMERIC_SETTER_KEY}'];
            }
        `);

        expect(result).toBe('target:6');
    });
});
