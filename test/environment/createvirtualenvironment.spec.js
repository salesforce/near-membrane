import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('createVirtualEnvironment', () => {
    it('no options', () => {
        const evalScript = createVirtualEnvironment();
        expect(() => evalScript('')).not.toThrow();
    });
    it('empty options', () => {
        const evalScript = createVirtualEnvironment({});
        expect(() => evalScript('')).not.toThrow();
    });
    it('keepAlive: true', () => {
        const count = window.frames.length;
        const evalScript = createVirtualEnvironment({ keepAlive: true });
        expect(window.frames.length).toBe(count + 1);
        expect(() => evalScript('')).not.toThrow();
    });
    it('keepAlive: false', () => {
        const evalScript = createVirtualEnvironment({ keepAlive: false });
        expect(() => evalScript('')).not.toThrow();
    });
});
