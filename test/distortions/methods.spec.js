import createVirtualEnvironment from '@locker/near-membrane-dom';

// patching the outer realm before extracting the descriptors
window.originalFetch = fetch;
window.wrappedFetch = (...args) => fetch(...args);

const distortionMap = new Map([
    [
        fetch,
        () => {
            throw new Error('forbidden');
        },
    ],
]);

function distortionCallback(v) {
    return distortionMap.get(v) || v;
}

const evalScript = createVirtualEnvironment(window, { distortionCallback });

describe('Method Distortion', () => {
    it('should be invoked when invoked directly', () => {
        expect.assertions(1);
        evalScript(`
            expect(() => {
                fetch('./invalid-network-request.json');
            }).toThrow();
        `);
    });
    it('should be invoked when invoked indirectly', () => {
        expect.assertions(1);
        evalScript(`
            expect(() => {
                originalFetch('./invalid-fetch.html');
            }).toThrow();
        `);
    });
    it('should bypass the restriction because fetch ref never goes throw the membrane', () => {
        expect.assertions(1);
        evalScript(`
            expect(() => {
                wrappedFetch('./invalid-fetch.html');
            }).not.toThrow();
        `);
    });
});
