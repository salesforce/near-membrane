import createVirtualEnvironment from '@locker/near-membrane-dom';

const originalHostDesc = Object.getOwnPropertyDescriptor(ShadowRoot.prototype, 'host');
const { get: hostGetter } = originalHostDesc;

const distortionMap = new Map([[hostGetter, () => null]]);

function distortionCallback(v) {
    return distortionMap.get(v) ?? v;
}

describe('protectDistortions', () => {
    afterEach(() => {
        if (!Object.getOwnPropertyDescriptor(ShadowRoot.prototype, 'host')) {
            Object.defineProperty(ShadowRoot.prototype, 'host', originalHostDesc);
        }
    });

    describe('when enabled', () => {
        it('should throw when deleting a property whose getter is distorted', () => {
            expect.assertions(1);

            const env = createVirtualEnvironment(window, {
                distortionCallback,
                liveTargetCallback() {
                    return true;
                },
                protectDistortions: true,
                globalObjectShape: window,
            });

            env.evaluate(`
                expect(() => {
                    delete ShadowRoot.prototype.host;
                }).toThrowError(TypeError);
            `);
        });

        it('should allow deleting properties that are not distorted', () => {
            expect.assertions(2);

            const env = createVirtualEnvironment(window, {
                distortionCallback,
                liveTargetCallback() {
                    return true;
                },
                protectDistortions: true,
                globalObjectShape: window,
            });

            env.evaluate(`
                const obj = { x: 1 };
                expect(delete obj.x).toBe(true);
                expect(obj.x).toBe(undefined);
            `);
        });

        it('should allow deleting an undistorted window API', () => {
            expect.assertions(3);

            const env = createVirtualEnvironment(window, {
                distortionCallback,
                liveTargetCallback() {
                    return true;
                },
                protectDistortions: true,
                globalObjectShape: window,
            });

            env.evaluate(`
                expect(delete window.AbortController).toBe(true);
                expect(window.AbortController).toBe(undefined);
            `);

            expect(window.AbortController).not.toBe(undefined);
        });

        it('should preserve the distorted getter after a failed delete attempt', () => {
            expect.assertions(2);

            const env = createVirtualEnvironment(window, {
                distortionCallback,
                liveTargetCallback() {
                    return true;
                },
                protectDistortions: true,
                globalObjectShape: window,
            });

            env.evaluate(`
                const elm = document.createElement('div');
                elm.attachShadow({ mode: 'open' });
                expect(() => {
                    delete ShadowRoot.prototype.host;
                }).toThrowError(TypeError);
                expect(elm.shadowRoot.host).toBe(null);
            `);
        });
    });

    describe('when disabled (default)', () => {
        it('should not throw when deleting a property whose getter is distorted', () => {
            expect.assertions(1);

            const env = createVirtualEnvironment(window, {
                distortionCallback,
                liveTargetCallback() {
                    return true;
                },
                globalObjectShape: window,
            });

            env.evaluate(`
                expect(() => {
                    delete ShadowRoot.prototype.host;
                }).not.toThrow();
            `);
        });
    });
});
