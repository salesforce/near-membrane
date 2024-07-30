const buffer = new ArrayBuffer(8);
const Ctors = [
    BigInt64Array,
    BigUint64Array,
    Float32Array,
    Float64Array,
    Int8Array,
    Int16Array,
    Int32Array,
    Uint8Array,
    Uint8ClampedArray,
    Uint16Array,
    Uint32Array,
];
for (const Ctor of Ctors) {
    class Subclass extends Ctor {
        constructor(arrayBuffer) {
            super(arrayBuffer);
            this[0] = this[0];
        }
    }
    const subclassed = new Subclass(buffer);
    expect(subclassed[0]).toBeDefined();
}
