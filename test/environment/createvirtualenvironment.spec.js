import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('createVirtualEnvironment', () => {
    it('no options', () => {
        const env = createVirtualEnvironment(window);
        expect(() => env.evaluate('')).not.toThrow();
    });
    it('empty options', () => {
        const env = createVirtualEnvironment(window, {});
        expect(() => env.evaluate('')).not.toThrow();
    });
    it('keepAlive: true', () => {
        const count = window.frames.length;
        const env = createVirtualEnvironment(window, { keepAlive: true });
        expect(window.frames.length).toBe(count + 1);
        expect(() => env.evaluate('')).not.toThrow();
    });
    it('keepAlive: false', () => {
        const env = createVirtualEnvironment(window, { keepAlive: false });
        expect(() => env.evaluate('')).not.toThrow();
    });
});
