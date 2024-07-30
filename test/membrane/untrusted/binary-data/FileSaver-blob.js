const blob = new Blob(['Hello, world!'], { type: 'text/plain;charset=utf-8' });
expect(() => {
    saveAs(blob, 'hello world.txt');
}).not.toThrow();

const blobB = new Blob([new Uint8Array([97, 98, 99])], { type: 'text/plain;charset=utf-8' });
expect(() => {
    saveAs(blobB, 'binary.txt');
}).not.toThrow();
