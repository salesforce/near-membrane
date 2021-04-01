import createSecureEnvironment from '@locker/near-membrane-dom';

const evalScript = createSecureEnvironment({ endowments: window });

describe('EventTarget unforgeable', () => {
    it('should be accessible from window', function() {
        // expect.assertions(4);
        evalScript(`
            expect(EventTarget !== undefined).toBe(true);
            expect(window.__proto__.__proto__.__proto__ === EventTarget.prototype).toBe(true);
            expect(document.body instanceof EventTarget).toBe(true);
            expect(document.createElement('p') instanceof EventTarget).toBe(true);
        `);
    });
});

describe('Window unforgeable', () => {
    it('should be accessible from window', function() {
        // expect.assertions(4);
        evalScript(`
            expect(Window !== undefined).toBe(true);
            expect(window.__proto__ === Window.prototype).toBe(true);
            expect(window instanceof Window).toBe(true);
            expect(globalThis instanceof Window).toBe(true);
        `);
    });
});
