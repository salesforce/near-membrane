const source = new Uint8Array([97, 98, 99]);
const blob = new Blob([source]);
const reader = new FileReader();

reader.onload = (event) => {
    expect(reader.result.byteLength).toBe(source.length);
    expect(reader.result).toBeInstanceOf(ArrayBuffer);
    done();
};
reader.readAsArrayBuffer(blob);
