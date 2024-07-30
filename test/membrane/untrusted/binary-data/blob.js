const a = new Uint8Array([97, 98, 99]);
const b = new Blob([a], { type: 'application/octet-stream' });
b.text().then((output) => {
    expect(output).toBe('abc');
    done();
});
