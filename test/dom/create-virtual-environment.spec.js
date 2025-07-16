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

    describe('creates an environment that is always kept alive (ie. sandbox host iframe attached)', () => {
        it('but is not discoverable via querySelectorAll', () => {
            createVirtualEnvironment(window /* no options */);
            const iframes = document.querySelectorAll('iframe');
            expect(iframes.length).toBe(0);
        });
        it('but is not discoverable via getElementsByTagName', () => {
            createVirtualEnvironment(window /* no options */);
            const iframes = document.getElementsByTagName('iframe');
            expect(iframes.length).toBe(0);
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
