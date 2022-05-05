import createVirtualEnvironment from '@locker/near-membrane-dom';

const env = createVirtualEnvironment(window, {
    endowments: Object.getOwnPropertyDescriptors(window),
});

describe('EventTarget unforgeable', () => {
    it('should be accessible from window', () => {
        expect.assertions(4);

        env.evaluate(`
            expect(EventTarget !== undefined).toBe(true);
            expect(window.__proto__.__proto__.__proto__ === EventTarget.prototype).toBe(true);
            expect(document.body instanceof EventTarget).toBe(true);
            expect(document.createElement('p') instanceof EventTarget).toBe(true);
        `);
    });
});

describe('Window unforgeable', () => {
    it('should be accessible from window', () => {
        expect.assertions(4);

        env.evaluate(`
            expect(Window !== undefined).toBe(true);
            expect(window.__proto__ === Window.prototype).toBe(true);
            expect(window instanceof Window).toBe(true);
            expect(globalThis instanceof Window).toBe(true);
        `);
    });
});
