import { makeSandboxes, mint } from './__util__/harness.js';

/**
 * AC3 behavior class: symbols / membrane-symbols across the double crossing
 * (red-A -> blue -> red-B). Covers well-known symbols (Symbol.iterator,
 * Symbol.toStringTag), registry symbols (Symbol.for), and a unique Symbol() used
 * as a property key, in both the A->B and A->B->A directions.
 *
 * Every observable is marshalled back to blue as a PRIMITIVE (string/boolean) so
 * assertions never lean on proxy structural equality. Values are locked to
 * current `main`.
 */
describe('cross-sandbox symbols: well-known symbols', () => {
    it('B consumes an A iterable via for..of (Symbol.iterator crosses)', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const iterable = mint(a, '{ *[Symbol.iterator]() { yield "x"; yield "y"; yield "z"; } }');
        const bForOf = b.evaluate('(o) => { let s = ""; for (const v of o) s += v; return s; }');
        expect(bForOf(iterable)).toBe('xyz');
    });

    it('B spreads an A iterable (Symbol.iterator crosses)', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const iterable = mint(a, '{ *[Symbol.iterator]() { yield 1; yield 2; yield 3; } }');
        const bSpread = b.evaluate('(o) => [...o].join(",")');
        expect(bSpread(iterable)).toBe('1,2,3');
    });

    it('A Symbol.toStringTag is observed by B via Object.prototype.toString', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const tagged = mint(a, '{ [Symbol.toStringTag]: "MyTag" }');
        const bTag = b.evaluate('(o) => Object.prototype.toString.call(o)');
        expect(bTag(tagged)).toBe('[object MyTag]');
    });
});

describe('cross-sandbox symbols: registry symbols (Symbol.for)', () => {
    it('B reads an A property keyed by a registry symbol (shared registry identity)', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const objFromA = mint(a, '{ [Symbol.for("cross-reg")]: "reg-value" }');
        const bRead = b.evaluate('(o) => String(o[Symbol.for("cross-reg")])');
        expect(bRead(objFromA)).toBe('reg-value');
    });

    it('A->B->A: B writing a registry-symbol key does not leak back to A (isolation)', () => {
        expect.assertions(2);
        const { a, b } = makeSandboxes();
        const objFromA = mint(a, '{ [Symbol.for("cross-rt")]: "A" }');
        const bWrite = b.evaluate(
            '(o) => { o[Symbol.for("cross-rt")] = "B"; return String(o[Symbol.for("cross-rt")]); }'
        );
        // B sees its own write locally...
        expect(bWrite(objFromA)).toBe('B');
        // ...but A's object is unchanged (matches the S2 data-writeback isolation).
        const aRead = a.evaluate('(o) => String(o[Symbol.for("cross-rt")])');
        expect(aRead(objFromA)).toBe('A');
    });
});

describe('cross-sandbox symbols: unique Symbol() as a key', () => {
    it('a unique symbol relayed with its object still unlocks the value in B', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        // A mints a unique symbol + an object keyed by it; both relayed to B.
        const bundle = a.evaluate(
            '(() => { const s = Symbol("uniq"); const o = {}; o[s] = "uniq-value"; return { s, o }; })()'
        );
        const bRead = b.evaluate('(o, s) => String(o[s])');
        expect(bRead(bundle.o, bundle.s)).toBe('uniq-value');
    });
});
