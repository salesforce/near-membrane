import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('createVirtualEnvironment', () => {
    it('no options', () => {
        const evalScript = createVirtualEnvironment(window);
        expect(() => evalScript('')).not.toThrow();
    });
    it('empty options', () => {
        const evalScript = createVirtualEnvironment(window, {});
        expect(() => evalScript('')).not.toThrow();
    });
    it('keepAlive: true', () => {
        const count = window.frames.length;
        const evalScript = createVirtualEnvironment(window, { keepAlive: true });
        expect(window.frames.length).toBe(count + 1);
        expect(() => evalScript('')).not.toThrow();
    });
    it('keepAlive: false', () => {
        const evalScript = createVirtualEnvironment(window, { keepAlive: false });
        expect(() => evalScript('')).not.toThrow();
    });
});
