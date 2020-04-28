import { evaluateSourceText } from '../../lib/browser-realm.js';

// getting reference to the function to be distorted
const { get: hostGetter } = Object.getOwnPropertyDescriptor(ShadowRoot.prototype, 'host');
const { get: localStorageGetter } = Object.getOwnPropertyDescriptor(window, 'localStorage');

const distortions = new Map([
    [hostGetter, () => {
        return null;
    }],
    [localStorageGetter, () => {
        return 'distorted localStorage';
    }]
]);

const endowments = {
    expect
};

describe('Getter Function Distortion', () => {
    it('should be invoked when invoked directly', function() {
        // expect.assertions(1);
        evaluateSourceText(`
            const elm = document.createElement('div');
            elm.attachShadow({ mode: 'open' });
            expect(elm.shadowRoot.host).toBe(null);    
        `, { distortions, endowments });
    });
    it('should be invoked when invoked indirectly', function() {
        // expect.assertions(1);
        evaluateSourceText(`
            const elm = document.createElement('div');
            elm.attachShadow({ mode: 'open' });
            const hostGetter = Object.getOwnPropertyDescriptor(ShadowRoot.prototype, 'host').get;
            expect(hostGetter.call(elm)).toBe(null);
        `, { distortions, endowments }); 
    });
    it('should work for global property accessors (issue #64)', function () {
        // expect.assertions(1);
        evaluateSourceText(`
            expect(localStorage).toBe('distorted localStorage');
        `, { distortions, endowments });
    });
});
