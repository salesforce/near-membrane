import { sandbox } from './__util__/harness.js';

/**
 * AC3 -- class extension across the double membrane (red-A -> blue -> red-B).
 *
 * Adapts three single-crossing specs to a GENERIC (non-DOM) class relayed from
 * one sandbox to another:
 *   - test/membrane/super.spec.js            (super()/super.prop semantics)
 *   - test/membrane/cross-ns-extensions.spec.js  (base -> red subclass -> relay -> red subclass)
 *   - test/dom/custom-elements-extensions.spec.js "NS-to-NS" block (three-tier instanceof)
 *
 * A base class minted in red-A is relayed to red-B (as an endowment -- the real
 * red-A -> blue -> red-B path, same shape those specs use via save/re-endow) and
 * subclassed in B. We pin that super() constructor chaining, super.method()
 * resolution, method override, and instanceof against BOTH the B subclass and the
 * A base all survive the double crossing.
 *
 * NB: super.spec.js wraps its assertions in a try/catch that downgrades any
 * failure to a `console.warn('Could not run this test')` -- so it would silently
 * PASS if super-semantics broke. This adaptation asserts HARD: values are computed
 * inside B, returned to blue, and checked with jasmine `expect`, so a regression
 * fails loudly. Values locked to `main` (HEAD).
 */
describe('cross-sandbox class extension: A base subclassed in B (A->B)', () => {
    it('super() chaining, super.method(), override, and instanceof hold across A->B', () => {
        expect.assertions(1);
        const a = sandbox({});
        const Base = a.evaluate(`(class Base {
            constructor() { this.tag = 'base-ctor'; }
            greet() { return 'base-greet'; }
        })`);
        const b = sandbox({ Base });
        const result = b.evaluate(`
            class Sub extends Base {
                constructor() { super(); this.sub = 'sub-ctor'; }
                greet() { return 'sub(' + super.greet() + ')'; }
            }
            const s = new Sub();
            JSON.stringify({
                superCtorRan: s.tag,
                subCtorRan: s.sub,
                superMethod: s.greet(),
                isSub: s instanceof Sub,
                isBase: s instanceof Base,
                protoChainToBase: Object.getPrototypeOf(Object.getPrototypeOf(s)) === Base.prototype,
            });
        `);
        // super() ran A's ctor, super.greet() reached A's method, instanceof holds
        // against both B's Sub and A's Base, and Sub.__proto__.__proto__ === A's
        // Base.prototype -- the whole chain survives the double crossing.
        expect(result).toBe(
            '{"superCtorRan":"base-ctor","subCtorRan":"sub-ctor","superMethod":"sub(base-greet)","isSub":true,"isBase":true,"protoChainToBase":true}'
        );
    });

    it('overridden method wins for the B subclass while the inherited A base method still resolves', () => {
        expect.assertions(1);
        const a = sandbox({});
        const Base = a.evaluate(`(class Base {
            base() { return 'from base'; }
            foo() { return 'base foo'; }
        })`);
        const b = sandbox({ Base });
        const result = b.evaluate(`
            class Bar extends Base { foo() { return 'bar foo override'; } }
            const bar = new Bar();
            JSON.stringify({ base: bar.base(), foo: bar.foo() });
        `);
        expect(result).toBe('{"base":"from base","foo":"bar foo override"}');
    });

    it('super.prop assignment writes to `this`, not the A base (hard-asserted; super.spec.js soft-fails here)', () => {
        expect.assertions(1);
        const a = sandbox({});
        const Foo = a.evaluate(`(class Foo {
            constructor() { this.value = 'base'; }
        })`);
        const b = sandbox({ Foo });
        const result = b.evaluate(`
            let out;
            class Bar extends Foo {
                constructor() {
                    super();
                    const beforeThis = this.value;
                    super.value = 'bar';
                    out = JSON.stringify({
                        beforeThis,
                        superValueAfter: super.value,
                        thisValueAfter: this.value,
                    });
                }
            }
            new Bar();
            out;
        `);
        // Per spec, `super.value = 'bar'` assigns through to `this` (receiver), so
        // this.value becomes 'bar' while `super.value` (a GET on A's Foo.prototype,
        // which has no own 'value') stays undefined -- and JSON.stringify drops the
        // undefined `superValueAfter` key, hence its absence below. Same outcome as
        // super.spec.js, but asserted hard instead of swallowed.
        expect(result).toBe('{"beforeThis":"base","thisValueAfter":"bar"}');
    });
});

describe('cross-sandbox class extension: three-tier chain (A base <- A subclass -> B subclass)', () => {
    it('a chain built A-internally then re-subclassed in B preserves instanceof and method resolution at every tier', () => {
        expect.assertions(1);
        const a = sandbox({});
        a.evaluate(`
            globalThis.Base = class Base { base() { return 'from base'; } };
            globalThis.Foo = class Foo extends Base { foo() { return 'from foo'; } };
        `);
        const Base = a.evaluate('Base');
        const Foo = a.evaluate('Foo');
        const b = sandbox({ Base, Foo });
        const result = b.evaluate(`
            class Bar extends Foo { foo() { return 'from bar override'; } }
            const bar = new Bar();
            JSON.stringify({
                base: bar.base(),
                foo: bar.foo(),
                tier2Intact: (new Foo()).foo(),
                isBar: bar instanceof Bar,
                isFoo: bar instanceof Foo,
                isBase: bar instanceof Base,
            });
        `);
        // All three tiers survive: B's override wins, A's Foo method is intact,
        // A's Base method resolves through the chain, and instanceof holds against
        // Bar (B), Foo (A) and Base (A).
        expect(result).toBe(
            '{"base":"from base","foo":"from bar override","tier2Intact":"from foo","isBar":true,"isFoo":true,"isBase":true}'
        );
    });
});
