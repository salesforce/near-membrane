import createVirtualEnvironment from '@locker/near-membrane-dom';

const distortionMap = new Map([
    [
        fetch,
        () => {
            throw new Error('forbidden');
        },
    ],
]);

describe('Method Distortion', () => {
    const envOptions = {
        distortionCallback(v) {
            return distortionMap.get(v) ?? v;
        },
        globalObjectShape: window,
    };

    it('should be invoked when invoked directly', () => {
        expect.assertions(1);

        const env = createVirtualEnvironment(window, envOptions);

        env.evaluate(`
            expect(() => {
                fetch('./invalid-network-request.json');
            }).toThrow();
        `);
    });
    it('should be invoked when invoked indirectly', () => {
        expect.assertions(1);

        window.originalFetch = fetch;

        const env = createVirtualEnvironment(window, envOptions);

        env.evaluate(`
            expect(() => {
                originalFetch('./invalid-fetch.html');
            }).toThrow();
        `);
    });
    it('should bypass the restriction because fetch ref never goes throw the membrane', () => {
        expect.assertions(1);

        window.wrappedFetch = (...args) => fetch(...args);

        const env = createVirtualEnvironment(window, envOptions);

        env.evaluate(`
            expect(() => {
                wrappedFetch('./invalid-fetch.html');
            }).not.toThrow();
        `);
    });
});
