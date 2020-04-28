import { evaluateSourceText } from '../../lib/browser-realm.js';

const distortions = new Map([
    [fetch, () => {
        throw new Error('forbidden');
    }],
]);

// patching the outer realm before extracting the descriptors
const endowments = {
    expect,
    originalFetch: fetch,
    wrappedFetch: (...args) => fetch(...args),
};

describe('Method Distortion', () => {
    it('should be invoked when invoked directly', function() {
        // expect.assertions(1);
        evaluateSourceText(`
            expect(() => {
                fetch('./invalid-network-request.json');
            }).toThrow();    
        `, { endowments, distortions });
    });
    it('should be invoked when invoked indirectly', function() {
        // expect.assertions(1);
        evaluateSourceText(`
            expect(() => {
                originalFetch('./invalid-fetch.html');
            }).toThrow();    
        `, { endowments, distortions });
    });
    it('should bypass the restriction because fetch ref never goes throw the membrane', function() {
        // expect.assertions(1);
        evaluateSourceText(`
            expect(() => {
                wrappedFetch('./invalid-fetch.html');
            }).not.toThrow();    
        `, { endowments, distortions });
    });
});
