import createVirtualEnvironment from '@locker/near-membrane-dom';

// @TODO: Skip Firefox and Safari because their intrinsic Promise of await
// is not able to be remapped.
const isFirefox = navigator.userAgent.includes('Firefox/');
const isSafari = navigator.userAgent.includes('Safari/');
const skipTests = isFirefox || isSafari;

describe('async/await', () => {
    (skipTests ? xit : it)('basic wrapping', (done) => {
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
