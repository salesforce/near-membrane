const ab = new ArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
const i32a = new Int32Array(ab);
i32a[0] = 9;
Atomics.add(i32a, 0, 33); // 42
Atomics.and(i32a, 0, 1); // 0
Atomics.exchange(i32a, 0, 42); // 42
Atomics.or(i32a, 0, 1); // 43
Atomics.store(i32a, 0, 18); // 18
Atomics.sub(i32a, 0, 10);
Atomics.xor(i32a, 0, 1);
expect(Atomics.load(i32a, 0)).toBe(9);
