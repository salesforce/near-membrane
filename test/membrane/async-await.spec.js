import createVirtualEnvironment from '@locker/near-membrane-dom';

// TODO #115 - Skip Firefox and Safari until we find a solution for them
const isFirefox = navigator.userAgent.includes('Firefox/');
const isSafari = navigator.userAgent.includes('Safari/');
const skipTests = isFirefox || isSafari;

if (!skipTests) {
    describe('async/await', () => {
        it('basic wrapping', (done) => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ done, expect }),
            });

            env.evaluate(`
                async function hello() {
                    return await "Hello";
                }
                hello().then((value) => {
                    expect(value).toBe("Hello");
                    done();
                });
            `);
        });
    });
}
