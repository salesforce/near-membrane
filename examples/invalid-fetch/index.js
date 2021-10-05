import createVirtualEnvironment from '@locker/near-membrane-dom';

// patching the outer realm before extracting the descriptors
window.originalFetch = fetch;
window.wrappedFetch = (...args) => fetch(...args);

const distortionMap = new Map([
    [fetch, () => {
        console.error('forbidden');
    }],
]);
const env = createVirtualEnvironment({
    distortionMap,
    endowments: window
});

env.evaluate(`
    debugger;

    // the distortion of fetch does nothing
    window.fetch('./invalid-network-request.json');
`);

env.evaluate(`
    debugger;

    // it will also throw because distortion it is based on identity
    window.originalFetch('./invalid-fetch.html');
`);

env.evaluate(`
    debugger;

    // it will bypass the restriction because fetch ref never goes throw the membrane
    window.wrappedFetch('./invalid-fetch.html');
`);
