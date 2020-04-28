import { evaluateSourceText } from '../lib/browser-realm.js';

// getting reference to the function to be distorted
const { get } = Object.getOwnPropertyDescriptor(ShadowRoot.prototype, 'host');

const distortions = new Map([
    [get, () => {
        console.error('forbidden');
        return null;
    }],
]);

evaluateSourceText(`
    debugger;

    // the distortion of ShadowRoot.prototype.host returns null
    const elm = document.createElement('div');
    elm.attachShadow({ mode: 'open' });
    console.log(elm.shadowRoot.host); // -> null
`, { distortions });
