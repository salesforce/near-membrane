const file = new File(['Hello, world!'], 'plaintext.txt', { type: 'text/plain;charset=utf-8' });
expect(() => {
    saveAs(file, 'plaintext.txt');
}).not.toThrow();

const fileB = new File([new Uint8Array([97, 98, 99])], 'binary.txt', {
    type: 'text/plain;charset=utf-8',
});
expect(() => {
    saveAs(fileB, 'binary.txt');
}).not.toThrow();
