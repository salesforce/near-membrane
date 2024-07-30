const buffer = new ArrayBuffer(8);
const dataView = new DataView(buffer);
expect(dataView[0]).toBe(undefined);
