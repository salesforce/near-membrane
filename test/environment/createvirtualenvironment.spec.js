import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('createVirtualEnvironment', () => {
    describe('with default settings', () => {
        describe('throws when', () => {
            it('no globalObject is provided', () => {
                expect(() => createVirtualEnvironment()).toThrow();
            });
        });
        describe('creates an environment when', () => {
            it('no options are provided', () => {
                const env = createVirtualEnvironment(window /* no options */);
                expect(() => env.evaluate('')).not.toThrow();
            });
            it('an empty options object is provided', () => {
                const env = createVirtualEnvironment(window, {});
                expect(() => env.evaluate('')).not.toThrow();
            });
            it('options object has endowments, but is undefined', () => {
                let endowments;
                const env = createVirtualEnvironment(window, { endowments });
                expect(() => env.evaluate('')).not.toThrow();
            });
            it('options object has endowments, but is empty', () => {
                const env = createVirtualEnvironment(window, {
                    endowments: {},
                });
                expect(() => env.evaluate('')).not.toThrow();
            });
            it('options object has keepAlive: true', () => {
                const count = window.frames.length;
                const env = createVirtualEnvironment(window, { keepAlive: true });
                expect(window.frames.length).toBe(count + 1);
                expect(() => env.evaluate('')).not.toThrow();
            });
            it('options object has keepAlive: false', () => {
                const env = createVirtualEnvironment(window, { keepAlive: false });
                expect(() => env.evaluate('')).not.toThrow();
            });
        });
    });
});
