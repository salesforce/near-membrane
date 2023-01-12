import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('createVirtualEnvironment', () => {
    describe('with default settings', () => {
        describe('throws when', () => {
            it('no globalObject is provided', () => {
                expect(() => createVirtualEnvironment()).toThrow();
            });
            it('an opaque globalObject is provided', () => {
                expect.assertions(1);
                const iframe = document.createElement('iframe');
                iframe.setAttribute('sandbox', '');
                document.body.appendChild(iframe);
                expect(() => createVirtualEnvironment(iframe.contentWindow)).toThrow();
                iframe.remove();
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
                const { length: framesOffset } = window.frames;
                const env = createVirtualEnvironment(window, { keepAlive: true });
                const iframes = document.body.querySelectorAll('iframe');
                expect(window.frames.length).toBe(framesOffset + 1);
                expect(() => env.evaluate('')).not.toThrow();
                iframes.forEach((iframe) => iframe.remove());
            });
            it('options object has keepAlive: true with the iframe proxy revoked', () => {
                const { length: framesOffset } = window.frames;
                const env1 = createVirtualEnvironment(window, { keepAlive: true });
                const env2 = createVirtualEnvironment(window, { keepAlive: true });
                document.body.append(document.createElement('iframe'));
                const iframes = document.body.querySelectorAll('iframe');
                const remapDescriptors = {
                    frames: {
                        configurable: true,
                        enumerable: true,
                        value: Array.from(window.frames),
                        writable: true,
                    },
                };
                env1.remapProperties(window, remapDescriptors);
                env2.remapProperties(window, remapDescriptors);
                for (const env of [env1, env2]) {
                    expect(() =>
                        env.evaluate(`
                            const { get: originalContentWindowGetter } =
                                Reflect.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
                            Reflect.apply(window.frames[${framesOffset}], originalContentWindowGetter, []);
                        `)
                    ).toThrow();
                    expect(() =>
                        env.evaluate(`
                            const { get: originalContentWindowGetter } =
                                Reflect.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
                            Reflect.apply(window.frames[${
                                framesOffset + 1
                            }], originalContentWindowGetter, []);
                        `)
                    ).toThrow();
                    expect(() =>
                        env.evaluate(`window.frames[${framesOffset + 2}].contentWindow;`)
                    ).not.toThrow();
                }
                iframes.forEach((iframe) => iframe.remove());
            });
            it('options object has keepAlive: false', () => {
                const env = createVirtualEnvironment(window, { keepAlive: false });
                expect(() => env.evaluate('')).not.toThrow();
            });
        });
    });
});
