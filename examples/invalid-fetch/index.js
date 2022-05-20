import createVirtualEnvironment from '@locker/near-membrane-dom';

// patching the outer realm before extracting the descriptors
window.originalFetch = fetch;

const distortionMap = new Map([
    [
        fetch,
        () => {
            console.error('forbidden');
        },
    ],
]);

const env = createVirtualEnvironment(window, {
    distortionCallback(v) {
        return distortionMap.get(v) ?? v;
    },
    endowments: Object.getOwnPropertyDescriptors({
        wrappedFetch(...args) {
            return fetch(...args);
        },
    }),
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
