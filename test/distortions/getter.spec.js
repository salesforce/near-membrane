import createSecureEnvironment from '../../lib/browser-realm.js';

// getting reference to the function to be distorted
const { get: hostGetter } = Object.getOwnPropertyDescriptor(ShadowRoot.prototype, 'host');
const { get: localStorageGetter } = Object.getOwnPropertyDescriptor(window, 'localStorage');

const distortionMap = new Map([
    [hostGetter, () => {
        return null;
    }],
    [localStorageGetter, () => {
        return 'distorted localStorage';
    }]
]);

const evalScript = createSecureEnvironment(distortionMap, window);

describe('Getter Function Distortion', () => {
    it('should be invoked when invoked directly', function() {
        // expect.assertions(1);
        evalScript(`
            const elm = document.createElement('div');
            elm.attachShadow({ mode: 'open' });
            expect(elm.shadowRoot.host).toBe(null);    
        `);
    });
    it('should be invoked when invoked indirectly', function() {
        // expect.assertions(1);
        evalScript(`
            const elm = document.createElement('div');
            elm.attachShadow({ mode: 'open' });
            const hostGetter = Object.getOwnPropertyDescriptor(ShadowRoot.prototype, 'host').get;
            expect(hostGetter.call(elm)).toBe(null);
        `); 
    });
    it('should work for global property accessors (issue #64)', function () {
        // expect.assertions(1);
        evalScript(`
            expect(localStorage).toBe('distorted localStorage');
        `);
    });
});
