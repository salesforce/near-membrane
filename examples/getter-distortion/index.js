import createVirtualEnvironment from '@locker/near-membrane-dom';

// getting reference to the function to be distorted
const { get } = Object.getOwnPropertyDescriptor(ShadowRoot.prototype, 'host');

const distortionMap = new Map([
    [get, () => {
        console.error('forbidden');
        return null;
    }],
]);

const env = createVirtualEnvironment({ distortionMap });

env.evaluate(`
    debugger;

    // the distortion of ShadowRoot.prototype.host returns null
    const elm = document.createElement('div');
    elm.attachShadow({ mode: 'open' });
    console.log(elm.shadowRoot.host); // -> null
`);
