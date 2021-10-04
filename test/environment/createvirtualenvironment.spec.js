import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('createVirtualEnvironment', () => {
    it('no shape', () => {
        let evalScript;
        expect(() => {
            evalScript = createVirtualEnvironment();
        }).not.toThrow();
        expect(() => evalScript('')).not.toThrow();
    });
    it('no options', () => {
        let evalScript;
        expect(() => {
            evalScript = createVirtualEnvironment(window);
        }).not.toThrow();
        expect(() => evalScript('')).not.toThrow();
    });
    it('empty options', () => {
        let evalScript;
        expect(() => {
            evalScript = createVirtualEnvironment(window, {});
        }).not.toThrow();
        expect(() => evalScript('')).not.toThrow();
    });
    it('keepAlive: true', () => {
        const count = window.frames.length;
        let evalScript;
        expect(() => {
            evalScript = createVirtualEnvironment(window, { keepAlive: true });
        }).not.toThrow();
        expect(window.frames.length).toBe(count + 1);
        expect(() => evalScript('')).not.toThrow();
    });
    it('keepAlive: false', () => {
        let evalScript;
        expect(() => {
            evalScript = createVirtualEnvironment(window, { keepAlive: false });
        }).not.toThrow();
        expect(() => evalScript('')).not.toThrow();
    });
});
