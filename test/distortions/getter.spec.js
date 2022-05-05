import createVirtualEnvironment from '@locker/near-membrane-dom';

// getting reference to the function to be distorted
const { get: hostGetter } = Object.getOwnPropertyDescriptor(ShadowRoot.prototype, 'host');
const { get: localStorageGetter } = Object.getOwnPropertyDescriptor(window, 'localStorage');

const distortionMap = new Map([
    [hostGetter, () => null],
    [localStorageGetter, () => 'distorted localStorage'],
]);

const env = createVirtualEnvironment(window, {
    distortionCallback(v) {
        return distortionMap.get(v) || v;
    },
    globalObjectShape: window,
});

describe('Getter Function Distortion', () => {
    it('should be invoked when invoked directly', () => {
        expect.assertions(1);

        env.evaluate(`
            const elm = document.createElement('div');
            elm.attachShadow({ mode: 'open' });
            expect(elm.shadowRoot.host).toBe(null);
        `);
    });
    it('should be invoked when invoked indirectly', () => {
        expect.assertions(1);

        env.evaluate(`
            const elm = document.createElement('div');
            elm.attachShadow({ mode: 'open' });
            const hostGetter = Object.getOwnPropertyDescriptor(ShadowRoot.prototype, 'host').get;
            expect(hostGetter.call(elm)).toBe(null);
        `);
    });
    it('should work for global property accessors (issue #64)', () => {
        expect.assertions(1);

        env.evaluate(`
            expect(localStorage).toBe('distorted localStorage');
        `);
    });
});
