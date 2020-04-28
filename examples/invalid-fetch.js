import { evaluateSourceText } from '../lib/browser-realm.js';

const endowments = {
    originalFetch: fetch,
    wrappedFetch: (...args) => fetch(...args),
}

const distortions = new Map([
    [fetch, () => {
        console.error('forbidden');
    }],
]);

evaluateSourceText(`
    debugger;

    // the distortion of fetch does nothing
    window.fetch('./invalid-network-request.json');
`, { endowments, distortions });

evaluateSourceText(`
    debugger;

    // it will also throw because distortion it is based on identity
    window.originalFetch('./invalid-fetch.html');
`, { endowments, distortions });

evaluateSourceText(`
    debugger;

    // it will bypass the restriction because fetch ref never goes throw the membrane
    window.wrappedFetch('./invalid-fetch.html');
`, { endowments, distortions });
