import createVirtualEnvironment from '@locker/near-membrane-dom';

// patching the outer realm before extracting the descriptors
window.originalFetch = fetch;
window.wrappedFetch = (...args) => fetch(...args);

const distortionMap = new Map([
    [fetch, () => {
        console.error('forbidden');
    }],
]);
const evalScript = createVirtualEnvironment({
    distortionMap,
    endowments: window
});

evalScript(`
    debugger;

    // the distortion of fetch does nothing
    window.fetch('./invalid-network-request.json');
`);

evalScript(`
    debugger;

    // it will also throw because distortion it is based on identity
    window.originalFetch('./invalid-fetch.html');
`);

evalScript(`
    debugger;

    // it will bypass the restriction because fetch ref never goes throw the membrane
    window.wrappedFetch('./invalid-fetch.html');
`);
