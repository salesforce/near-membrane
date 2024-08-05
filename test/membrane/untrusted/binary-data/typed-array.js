const buffer = new ArrayBuffer(8);
const bigIntTypedArrays = [new BigInt64Array(buffer), new BigUint64Array(buffer)];
for (const bigIntTypedArray of bigIntTypedArrays) {
    expect(typeof bigIntTypedArray[0]).toBe('bigint');
}
const typedArrays = [
    new Float32Array(buffer),
    new Float64Array(buffer),
    new Int8Array(buffer),
    new Int16Array(buffer),
    new Int32Array(buffer),
    new Uint8Array(buffer),
    new Uint8ClampedArray(buffer),
    new Uint16Array(buffer),
    new Uint32Array(buffer),
];
for (const typedArray of typedArrays) {
    expect(typeof typedArray[0]).toBe('number');
}
