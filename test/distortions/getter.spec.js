import createSecureEnvironment from '../../lib/browser-realm.js';

// getting reference to the function to be distorted
const { get } = Object.getOwnPropertyDescriptor(ShadowRoot.prototype, 'host');

const distortionMap = new Map([
    [get, () => {
        return null;
    }],
]);

const evalScript = createSecureEnvironment(distortionMap);

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
});
