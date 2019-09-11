import { SecureEnvironment } from '../lib/environment.js';

// getting reference to the function to be distorted
const { get } = Object.getOwnPropertyDescriptor(ShadowRoot.prototype, 'host');

const descriptors = Object.getOwnPropertyDescriptors(window);
const env = new SecureEnvironment({
    descriptors,
    distortionCallback(t) {
        if (t === get) {
            return () => {
                console.error('forbidden');
                return null;
            }
        }
        return t;
    }
});

env.evaluate(`
    debugger;

    // the distortion of ShadowRoot.prototype.host returns null
    const elm = document.createElement('div');
    elm.attachShadow({ mode: 'open' });
    elm.shadowRoot.host; // yields null
`);
