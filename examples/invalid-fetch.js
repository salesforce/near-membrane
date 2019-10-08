import createSecureEnvironment from '../lib/browser-realm.js';

// patching the outer realm before extracting the descriptors
window.originalFetch = fetch;
window.wrappedFetch = (...args) => fetch(...args);

function distortionCallback(t) {
    if (t === fetch) {
        return () => {
            console.error('forbidden');
        }
    }
    return t;
}

const secureGlobalThis = createSecureEnvironment(distortionCallback);

secureGlobalThis.eval(`
    debugger;

    // the distortion of fetch does nothing
    window.fetch('./invalid-network-request.json');
`);

secureGlobalThis.eval(`
    debugger;

    // it will also throw because distortion it is based on identity
    window.originalFetch('./invalid-fetch.html');
`);

secureGlobalThis.eval(`
    debugger;

    // it will bypass the restriction because fetch ref never goes throw the membrane
    window.wrappedFetch('./invalid-fetch.html');
`);
