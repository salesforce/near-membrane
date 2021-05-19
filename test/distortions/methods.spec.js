import createVirtualEnvironment from '@locker/near-membrane-dom';

// patching the outer realm before extracting the descriptors
window.originalFetch = fetch;
window.wrappedFetch = (...args) => fetch(...args);

const distortionMap = new Map([
    [fetch, () => {
        throw new Error('forbidden');
    }],
]);
const evalScript = createVirtualEnvironment({ distortionMap, endowments: window });

describe('Method Distortion', () => {
    it('should be invoked when invoked directly', function() {
        expect.assertions(1);
        evalScript(`
            expect(() => {
                fetch('./invalid-network-request.json');
            }).toThrow();
        `);
    });
    it('should be invoked when invoked indirectly', function() {
        expect.assertions(1);
        evalScript(`
            expect(() => {
                originalFetch('./invalid-fetch.html');
            }).toThrow();
        `);
    });
    it('should bypass the restriction because fetch ref never goes throw the membrane', function() {
        expect.assertions(1);
        evalScript(`
            expect(() => {
                wrappedFetch('./invalid-fetch.html');
            }).not.toThrow();
        `);
    });
});
