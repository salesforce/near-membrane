import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('createVirtualEnvironment', () => {
    describe('throws when', () => {
        it('no globalObject is provided', () => {
            expect(() => createVirtualEnvironment()).toThrow();
        });
        it('an opaque globalObject is provided', () => {
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
    });

    describe('options.distortionCallback', () => {
        it('distorts getters', () => {
            expect.assertions(3);

            const aGetter = () => 'a';
            const bGetter = () => 'b';
            const cGetter = () => 'c';
            const env = createVirtualEnvironment(window, {
                distortionCallback(v) {
                    if (v === aGetter) {
                        return bGetter;
                    }
                    if (v === bGetter) {
                        return aGetter;
                    }
                    return v;
                },
            });
            env.remapProperties(window, {
                a: {
                    get: aGetter,
                    configurable: true,
                },
                b: {
                    get: bGetter,
                    configurable: true,
                },
                c: {
                    get: cGetter,
                    configurable: true,
                },
            });
            expect(env.evaluate('a')).toBe('b');
            expect(env.evaluate('b')).toBe('a');
            expect(env.evaluate('c')).toBe('c');
        });
    });

    describe('options.keepAlive', () => {
        it('is true', () => {
            expect.assertions(2);

            const { length: framesOffset } = window.frames;
            const env = createVirtualEnvironment(window, { keepAlive: true });
            const iframes = [...document.body.querySelectorAll('iframe')];
            expect(window.frames.length).toBe(framesOffset + 1);
            expect(() => env.evaluate('')).not.toThrow();
            iframes.forEach((iframe) => iframe.remove());
        });
        it('is true and revokes the attached iframe proxy', () => {
            expect.assertions(16);

            const { length: framesOffset } = window.frames;
            const env1 = createVirtualEnvironment(window, { keepAlive: true });
            const env2 = createVirtualEnvironment(window, { keepAlive: true });
            document.body.append(document.createElement('iframe'));
            const iframes = [...document.body.querySelectorAll('iframe')];
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
                for (let i = 0; i < 3; i += 1) {
                    expect(() =>
                        env.evaluate(`
                            const contentWindow = window.frames[${framesOffset + i}];
                            const iframes = [...document.body.querySelectorAll('iframe')];
                            const iframe = iframes.find((iframe) => iframe.contentWindow === contentWindow);
                            iframe.contentDocument;
                            iframe.contentWindow;
                        `)
                    ).not.toThrow();
                    if (i === 2) {
                        expect(() =>
                            env.evaluate(`
                                const contentWindow = window.frames[${framesOffset + i}];
                                const iframes = [...document.body.querySelectorAll('iframe')];
                                const iframe = iframes.find((iframe) => iframe.contentWindow === contentWindow);
                                iframe.contentDocument.nodeName;
                                iframe.contentWindow.parent;
                            `)
                        ).not.toThrow();
                    } else {
                        expect(() =>
                            env.evaluate(`
                                const contentWindow = window.frames[${framesOffset + i}];
                                const iframes = [...document.body.querySelectorAll('iframe')];
                                const iframe = iframes.find((iframe) => iframe.contentWindow === contentWindow);
                                iframe.contentDocument.nodeName;
                            `)
                        ).toThrow();
                        expect(() =>
                            env.evaluate(`
                                const contentWindow = window.frames[${framesOffset + i}];
                                const iframes = [...document.body.querySelectorAll('iframe')];
                                const iframe = iframes.find((iframe) => iframe.contentWindow === contentWindow);
                                iframe.contentWindow.parent;
                            `)
                        ).toThrow();
                    }
                }
            }
            iframes.forEach((iframe) => iframe.remove());
        });
        it('is false', () => {
            const env = createVirtualEnvironment(window, { keepAlive: false });
            expect(() => env.evaluate('')).not.toThrow();
        });
    });

    describe('options.liveTargetCallback', () => {
        it('affects target liveness', () => {
            const a = { foo: 1 };
            const b = { foo: 1 };
            const env = createVirtualEnvironment(window, {
                liveTargetCallback(v) {
                    return v === a;
                },
            });
            env.remapProperties(window, {
                a: {
                    value: a,
                    configurable: true,
                },
                b: {
                    value: b,
                    configurable: true,
                },
            });
            env.evaluate('a.bar = 2');
            env.evaluate('b.bar = 2');
            expect(a).toEqual({ foo: 1, bar: 2 });
            expect(b).toEqual({ foo: 1 });
        });
    });

    describe('options.signSourceCallback', () => {
        it('is called for code evaluation', () => {
            const options = {
                signSourceCallback: (sourceText) => sourceText,
            };
            const signSourceCallbackSpy = spyOn(options, 'signSourceCallback').and.callThrough();
            const env = createVirtualEnvironment(window, options);
            expect(env.evaluate('1 + 2')).toBe(3);
            expect(signSourceCallbackSpy).toHaveBeenCalledTimes(2);
        });
    });
});
