import createSecureEnvironment from '../lib/browser-realm.js';

// getting reference to the function to be distorted
const { get } = Object.getOwnPropertyDescriptor(ShadowRoot.prototype, 'host');

const distortionMap = new Map([
    [get, () => {
        console.error('forbidden');
        return null;
    }],
]);

const secureGlobalThis = createSecureEnvironment(distortionMap);

secureGlobalThis.eval(`
    debugger;

    // the distortion of ShadowRoot.prototype.host returns null
    const elm = document.createElement('div');
    elm.attachShadow({ mode: 'open' });
    console.log(elm.shadowRoot.host); // -> null
`);
