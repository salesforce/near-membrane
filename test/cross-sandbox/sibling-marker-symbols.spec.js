import { sandbox } from './__util__/harness.js';

/**
 * Tier-3 -- near-membrane MARKER SYMBOLS across the double membrane
 * (red-A -> blue -> red-B). Adapts `test/membrane/membrane-symbols.spec.js`.
 *
 * near-membrane exposes two well-known registered symbols that let an observer
 * fingerprint a membrane proxy WITHOUT tripping user code:
 *   - `@@lockerNearMembrane`               -> reveals the value IS a membrane proxy
 *   - `@@lockerNearMembraneSerializedValue`-> reveals a safe primitive serialization
 * Both use a two-step "unlock" protocol: a `has()` trap check (`SYMBOL in v`, which
 * returns false) must immediately precede the `get()` (`v[SYMBOL]`); a `get()` with
 * no preceding `has()` yields `undefined`.
 *
 * The single-crossing suite establishes the detection is ASYMMETRIC: only a BLUE
 * proxy (a red value observed from the host) reports the marker; a RED proxy (a
 * blue value observed from inside a sandbox) does not -- a sandbox must not be able
 * to tell it is sandboxed. This spec pins what that asymmetry becomes over TWO
 * hops: the host can still fingerprint a sandbox object, and (characterized) what a
 * sibling sandbox sees of the other sibling's object.
 *
 * Values locked to observed behavior on `main` (HEAD).
 */

const LOCKER_NEAR_MEMBRANE_SYMBOL = Symbol.for('@@lockerNearMembrane');
const LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL = Symbol.for(
    '@@lockerNearMembraneSerializedValue'
);

// The full unlock protocol, run from the host (blue) side.
function probe(value, symbol) {
    const unlockHas = symbol in value; // false, but unlocks the flag
    const flag = value[symbol]; // the revealed value (if any)
    const again = value[symbol]; // undefined -- no preceding has()
    const desc = Reflect.getOwnPropertyDescriptor(value, symbol);
    return `${String(unlockHas)}|${String(flag)}|${String(again)}|${String(desc)}`;
}

describe('cross-sandbox marker symbols: host fingerprints a sandbox object (blue proxy)', () => {
    it('the host detects an A object as a near-membrane proxy via the has()-then-get() protocol', () => {
        expect.assertions(1);
        const a = sandbox();
        a.evaluate('globalThis.o = { data: 1 };');
        const o = a.evaluate('o'); // blue proxy of A's red object
        expect(probe(o, LOCKER_NEAR_MEMBRANE_SYMBOL)).toBe('false|true|undefined|undefined');
    });

    it('a plain same-realm (host) object is NOT a near-membrane proxy (negative control)', () => {
        expect.assertions(1);
        const raw = { data: 1 };
        expect(probe(raw, LOCKER_NEAR_MEMBRANE_SYMBOL)).toBe('false|undefined|undefined|undefined');
    });

    // The unlock is a strict handshake over module-level state, so each read must
    // be a clean has()-immediately-then-get() on a freshly extracted value;
    // interleaving probes corrupts the shared flag. One value per test keeps it
    // robust.
    it('the host reads the serialized value of an A boxed Number (42)', () => {
        expect.assertions(2);
        const a = sandbox();
        a.evaluate('globalThis.bn = new Number(42);');
        const bn = a.evaluate('bn');
        // Clean handshake: has() then get() with nothing between.
        const has = LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL in bn;
        const sv = bn[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL];
        expect(has).toBe(false);
        expect(sv).toBe(42);
    });

    it('the host reads the serialized value of an A boxed String and Boolean', () => {
        expect.assertions(2);
        const aStr = sandbox();
        aStr.evaluate("globalThis.bs = new String('hello');");
        const bs = aStr.evaluate('bs');
        // Bind the has() result so the bundler can't drop it as a no-op; the get()
        // must immediately follow to keep the handshake intact.
        const strHas = LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL in bs;
        const strSv = bs[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL];
        expect(`${String(strHas)}|${String(strSv)}`).toBe('false|hello');

        const aBool = sandbox();
        aBool.evaluate('globalThis.bb = new Boolean(true);');
        const bb = aBool.evaluate('bb');
        const boolHas = LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL in bb;
        const boolSv = bb[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL];
        expect(`${String(boolHas)}|${String(boolSv)}`).toBe('false|true');
    });

    it('the host reads the serialized value of an A RegExp (flags + source JSON)', () => {
        expect.assertions(1);
        const a = sandbox();
        a.evaluate('globalThis.re = /abc/gi;');
        const re = a.evaluate('re');
        const reHas = LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL in re;
        const reSv = re[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL];
        expect(`${String(reHas)}|${String(reSv)}`).toBe(
            `false|${JSON.stringify({ flags: 'gi', source: 'abc' })}`
        );
    });
});

describe('cross-sandbox marker symbols: sibling sandbox observes the other sibling (red proxy over two hops)', () => {
    it('B observing an A object runs the protocol -- characterizes double-membrane detectability', () => {
        expect.assertions(1);
        const a = sandbox();
        a.evaluate('globalThis.o = { data: 1 };');
        const o = a.evaluate('o');
        const b = sandbox({ o });

        // Run the same unlock protocol from INSIDE B. From B's vantage the value is
        // a red proxy (B's inward wrapper around A's blue proxy); by the design of
        // the marker, a sandbox should not be able to fingerprint it.
        const result = b.evaluate(`(() => {
            const NM = Symbol.for('@@lockerNearMembrane');
            const unlockHas = NM in o;
            const flag = o[NM];
            const again = o[NM];
            return [String(unlockHas), String(flag), String(again)].join('|');
        })()`);
        expect(result).toBe('false|undefined|undefined');
    });

    it('B reading the serialized value of an A boxed primitive -- characterizes double-membrane behavior', () => {
        expect.assertions(1);
        const a = sandbox();
        a.evaluate('globalThis.boxedNumber = new Number(42);');
        const boxedNumber = a.evaluate('boxedNumber');
        const b = sandbox({ boxedNumber });

        const result = b.evaluate(`(() => {
            const SV = Symbol.for('@@lockerNearMembraneSerializedValue');
            const unlockHas = SV in boxedNumber;
            return String(boxedNumber[SV]);
        })()`);
        expect(result).toBe('undefined');
    });
});
