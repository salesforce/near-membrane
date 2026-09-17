import { makeSandboxes, mint } from './__util__/harness.js';

/**
 * AC3 -- binary / typed data across the double membrane (red-A -> blue -> red-B).
 *
 * A mints ArrayBuffer / TypedArray / DataView values; B observes brand, length,
 * byteLength, element reads, constructs views over a relayed buffer, and writes
 * through. Values are locked to `main`.
 *
 * Notable: `instanceof` resolves TRUE in B's realm (the re-wrapped proxy's
 * prototype chain lands on B's own %TypedArray% constructors) and the brand tag
 * is preserved. A B write into an A-minted Uint8Array is LIVE (A observes it) --
 * consistent with the arrays.spec.js liveness finding and, again, in tension with
 * s2-data-writeback.spec.js's plain-object containment.
 */
describe('cross-sandbox typed data: A -> B', () => {
    it('B reads an A-minted Uint8Array (brand, length, byteLength, elements)', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const u8 = mint(a, 'new Uint8Array([10, 20, 30])');
        const probe = b.evaluate(`(o) => JSON.stringify({
            instanceofU8: o instanceof Uint8Array,
            isU8Tag: Object.prototype.toString.call(o),
            length: o.length,
            byteLength: o.byteLength,
            first: o[0],
            last: o[2],
        })`);
        expect(probe(u8)).toBe(
            '{"instanceofU8":true,"isU8Tag":"[object Uint8Array]","length":3,"byteLength":3,"first":10,"last":30}'
        );
    });

    it('A observes a B write into an A-minted Uint8Array (LIVE)', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const u8 = mint(a, 'new Uint8Array([10, 20, 30])');
        const bWrite = b.evaluate(`(o) => { o[0] = 99; return o[0]; }`);
        const bVal = bWrite(u8);
        const aRead = a.evaluate(`(o) => o[0]`);
        expect(`bVal=${bVal} aVal=${aRead(u8)}`).toBe('bVal=99 aVal=99');
    });

    it('B reads an A-minted Int32Array (brand, length, byteLength, signed values)', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const i32 = mint(a, 'new Int32Array([1000, -2000, 3000])');
        const probe = b.evaluate(`(o) => JSON.stringify({
            instanceofI32: o instanceof Int32Array,
            length: o.length,
            byteLength: o.byteLength,
            values: [o[0], o[1], o[2]].join(','),
        })`);
        expect(probe(i32)).toBe(
            '{"instanceofI32":true,"length":3,"byteLength":12,"values":"1000,-2000,3000"}'
        );
    });

    it('B observes an A-minted ArrayBuffer and constructs a view over it', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const buf = mint(a, 'new Uint8Array([1, 2, 3, 4]).buffer');
        const probe = b.evaluate(`(o) => JSON.stringify({
            instanceofAB: o instanceof ArrayBuffer,
            byteLength: o.byteLength,
            viewFirst: (() => { try { return new Uint8Array(o)[0]; } catch (e) { return 'throw:' + e.name; } })(),
        })`);
        expect(probe(buf)).toBe('{"instanceofAB":true,"byteLength":4,"viewFirst":1}');
    });

    it('B reads an A-minted DataView', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const dv = mint(
            a,
            '(() => { const b = new ArrayBuffer(8); const d = new DataView(b); d.setInt32(0, 305419896); return d; })()'
        );
        const probe = b.evaluate(`(o) => JSON.stringify({
            instanceofDV: o instanceof DataView,
            byteLength: o.byteLength,
            readInt32: (() => { try { return o.getInt32(0); } catch (e) { return 'throw:' + e.name; } })(),
        })`);
        expect(probe(dv)).toBe('{"instanceofDV":true,"byteLength":8,"readInt32":305419896}');
    });
});

describe('cross-sandbox typed data: B -> A (reverse direction)', () => {
    it('A reads a B-minted Float64Array', () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const f64 = mint(b, 'new Float64Array([1.5, 2.5, 3.5])');
        const probe = a.evaluate(`(o) => JSON.stringify({
            instanceofF64: o instanceof Float64Array,
            length: o.length,
            sum: o[0] + o[1] + o[2],
        })`);
        expect(probe(f64)).toBe('{"instanceofF64":true,"length":3,"sum":7.5}');
    });
});
