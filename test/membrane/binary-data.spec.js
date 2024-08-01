/* eslint-disable no-underscore-dangle, no-alert */

import createVirtualEnvironment from '@locker/near-membrane-dom';

const untrusted = (name) => window.__FIXTURES__[`test/membrane/untrusted/binary-data/${name}`];

function createEnvironmentThatAlwaysRemapsTypedArray() {
    const alwayRemapping = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ expect, OuterUint8Array: Uint8Array }),
    });

    alwayRemapping.evaluate(untrusted('always-remaps.js'));
}
// Safari Technology Preview may not have support for Atomics enabled.
if (typeof Atomics !== 'undefined') {
    describe('Atomics', () => {
        beforeEach(createEnvironmentThatAlwaysRemapsTypedArray);

        it('operates on atomic-friendly typed arrays', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
            });

            env.evaluate(untrusted('atomics.js'));
        });

        it('fails to operate on atomic-friendly typed arrays, when maxCompatMode is false', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
                maxCompatMode: false,
            });

            expect(() => env.evaluate(untrusted('atomics.js'))).toThrow();
        });
    });
}

describe('Blob', () => {
    beforeEach(createEnvironmentThatAlwaysRemapsTypedArray);

    it('encodes blobs from typed arrays', (done) => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ done, expect }),
        });

        env.evaluate(untrusted('blob.js'));
    });
    it('encode blobs from typed arrays, when maxCompatMode is false', (done) => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ done, expect }),
            maxCompatMode: false,
        });

        env.evaluate(untrusted('blob.js'));
    });
});

describe('Crypto', () => {
    beforeEach(createEnvironmentThatAlwaysRemapsTypedArray);

    it('creates random values from typed arrays', (done) => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ done, expect }),
        });

        env.evaluate(untrusted('crypto.js'));
    });
    it('creates random values from typed arrays, when maxCompatMode is false', (done) => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ done, expect }),
            maxCompatMode: false,
        });

        env.evaluate(untrusted('crypto.js'));
    });
    it('ignores the presence of crypto in endowments if maxCompatMode is false', (done) => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ Crypto, crypto, done, expect }),
            maxCompatMode: false,
        });

        env.evaluate(untrusted('crypto.js'));
    });
});

describe('DataView', () => {
    beforeEach(createEnvironmentThatAlwaysRemapsTypedArray);

    it('should not support index access', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(untrusted('data-view.js'));
    });
    it('should not support index access, when maxCompatMode is false', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            maxCompatMode: false,
        });

        env.evaluate(untrusted('data-view.js'));
    });
});

describe('FileReader', () => {
    beforeEach(createEnvironmentThatAlwaysRemapsTypedArray);

    it('reads from blobs created from typed arrays', (done) => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ done, expect }),
        });

        env.evaluate(untrusted('file-reader.js'));
    });
    it('reads from blobs created from typed arrays, when maxCompatMode is false', (done) => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ done, expect }),
            maxCompatMode: false,
        });

        env.evaluate(untrusted('file-reader.js'));
    });
});

describe('TypedArray', () => {
    beforeEach(createEnvironmentThatAlwaysRemapsTypedArray);

    it('should support in bound index access', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(untrusted('typed-array.js'));
    });
    it('should support in bound index access, when maxCompatMode is false', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            maxCompatMode: false,
        });

        env.evaluate(untrusted('typed-array.js'));
    });
    it('should support in bound index access with modified prototypes', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(untrusted('typed-array-modified.js'));
    });
    it('should support in bound index access with modified prototypes, when maxCompatMode is false', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            maxCompatMode: false,
        });

        env.evaluate(untrusted('typed-array-modified.js'));
    });
    it('should support setting in bound index values on subclasses', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(untrusted('typed-array-subclass.js'));
    });
    it('should support setting in bound index values on subclasses, when maxCompatMode is false', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            maxCompatMode: false,
        });

        env.evaluate(untrusted('typed-array-subclass.js'));
    });
    it('should treat out of bound index access as undefined', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(untrusted('typed-array-out-of-bound.js'));
    });
    it('should treat out of bound index access as undefined, when maxCompatMode is false', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            maxCompatMode: false,
        });

        env.evaluate(untrusted('typed-array-out-of-bound.js'));
    });
    it('should support subarray method', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(untrusted('typed-array-subarray.js'));
    });
    it('should support subarray method, when maxCompatMode is false', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            maxCompatMode: false,
        });

        env.evaluate(untrusted('typed-array-subarray.js'));
    });
});

describe('URL', () => {
    beforeEach(createEnvironmentThatAlwaysRemapsTypedArray);

    it('can create a typed array blob url', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });
        env.evaluate(untrusted('url-typed-array.js'));
    });
    it('can create a typed array blob url, when maxCompatMode is false', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            maxCompatMode: false,
        });
        env.evaluate(untrusted('url-typed-array.js'));
    });
    it('can create an svg blob url', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(untrusted('url-svg.js'));
    });
    it('can create an svg blob url, when maxCompatMode is false', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            maxCompatMode: false,
        });
        env.evaluate(untrusted('url-svg.js'));
    });

    it('can create an html blob url', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(untrusted('url-html.js'));
    });
    it('can create an html blob url, when maxCompatMode is false', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            maxCompatMode: false,
        });
        env.evaluate(untrusted('url-html.js'));
    });

    it('can create an xml blob url', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(untrusted('url-xml.js'));
    });
    it('can create an xml blob url, when maxCompatMode is false', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            maxCompatMode: false,
        });
        env.evaluate(untrusted('url-xml.js'));
    });

    it('can create a File blob url', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(untrusted('url-file-blob.js'));
    });
    it('can create a File blob url, when maxCompatMode is false', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            maxCompatMode: false,
        });
        env.evaluate(untrusted('url-file-blob.js'));
    });
});

describe('FileSaver library', () => {
    beforeEach(createEnvironmentThatAlwaysRemapsTypedArray);

    it('can create a blob to save as', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            ${untrusted('FileSaver.js')}
            ${untrusted('FileSaver-blob.js')}
        `);
    });
    it('can create a blob to save as, when maxCompatMode is false', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            maxCompatMode: false,
        });

        env.evaluate(`
            ${untrusted('FileSaver.js')}
            ${untrusted('FileSaver-blob.js')}
        `);
    });

    it('can create a file to save as', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            ${untrusted('FileSaver.js')}
            ${untrusted('FileSaver-file.js')}
        `);
    });
    it('can create a file to save as, when maxCompatMode is false', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            maxCompatMode: false,
        });

        env.evaluate(`
            ${untrusted('FileSaver.js')}
            ${untrusted('FileSaver-file.js')}
        `);
    });
});
