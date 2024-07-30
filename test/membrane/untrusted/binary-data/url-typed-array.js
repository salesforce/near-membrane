const source = new Uint8Array([97, 98, 99]);
const blob = new Blob([source]);
expect(() => {
    URL.createObjectURL(blob);
}).not.toThrow();
