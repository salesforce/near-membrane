/* eslint-disable no-underscore-dangle, no-alert */

import createVirtualEnvironment from '@locker/near-membrane-dom';

const untrusted = (name) => window.__FIXTURES__[`test/membrane/untrusted/binary-data/${name}`];

function createBaseLineMaxCompatModeEnvironment() {
    const alwayRemapping = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ expect, OuterUint8Array: Uint8Array }),
    });

    alwayRemapping.evaluate(untrusted('always-remaps.js'));
}

describe('Binary Data and maxPerfMode:', () => {
    // Safari Technology Preview may not have support for Atomics enabled.
    if (typeof Atomics !== 'undefined') {
        describe('Atomics:', () => {
            beforeEach(createBaseLineMaxCompatModeEnvironment);

            it('operates on atomic-friendly typed arrays', () => {
                const env = createVirtualEnvironment(window, {
                    endowments: Object.getOwnPropertyDescriptors({ expect }),
                });

                env.evaluate(untrusted('atomics.js'));
            });

            it('operates on atomic-friendly typed arrays, when maxPerfMode is true', () => {
                const env = createVirtualEnvironment(window, {
                    endowments: Object.getOwnPropertyDescriptors({ expect }),
                    maxPerfMode: true,
                });

                env.evaluate(untrusted('atomics.js'));
            });
        });
    }

    describe('Blob:', () => {
        beforeEach(createBaseLineMaxCompatModeEnvironment);

        it('encodes blobs from typed arrays', (done) => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ done, expect }),
            });

            env.evaluate(untrusted('blob.js'));
        });
        it('encode blobs from typed arrays, when maxPerfMode is true', (done) => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ done, expect }),
                maxPerfMode: true,
            });

            env.evaluate(untrusted('blob.js'));
        });
    });

    describe('Crypto:', () => {
        beforeEach(createBaseLineMaxCompatModeEnvironment);

        it('creates random values from typed arrays', (done) => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ done, expect }),
            });

            env.evaluate(untrusted('crypto.js'));
        });
        it('creates random values from typed arrays, when maxPerfMode is true', (done) => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ done, expect }),
                maxPerfMode: true,
            });

            env.evaluate(untrusted('crypto.js'));
        });
        it('ignores the presence of crypto in endowments if maxPerfMode is true', (done) => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ Crypto, crypto, done, expect }),
                maxPerfMode: true,
            });

            env.evaluate(untrusted('crypto.js'));
        });
    });

    describe('DataView:', () => {
        beforeEach(createBaseLineMaxCompatModeEnvironment);

        it('should not support index access', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
            });

            env.evaluate(untrusted('data-view.js'));
        });
        it('should not support index access, when maxPerfMode is true', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
                maxPerfMode: true,
            });

            env.evaluate(untrusted('data-view.js'));
        });
    });

    describe('FileReader:', () => {
        beforeEach(createBaseLineMaxCompatModeEnvironment);

        it('reads from blobs created from typed arrays', (done) => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ done, expect }),
            });

            env.evaluate(untrusted('file-reader.js'));
        });
        it('reads from blobs created from typed arrays, when maxPerfMode is true', (done) => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ done, expect }),
                maxPerfMode: true,
            });

            env.evaluate(untrusted('file-reader.js'));
        });
    });

    describe('TypedArray:', () => {
        beforeEach(createBaseLineMaxCompatModeEnvironment);

        it('should support in bound index access', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
            });

            env.evaluate(untrusted('typed-array.js'));
        });
        it('should support in bound index access, when maxPerfMode is true', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
                maxPerfMode: true,
            });

            env.evaluate(untrusted('typed-array.js'));
        });
        it('should support in bound index access with modified prototypes', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
            });

            env.evaluate(untrusted('typed-array-modified.js'));
        });
        it('should support in bound index access with modified prototypes, when maxPerfMode is true', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
                maxPerfMode: true,
            });

            env.evaluate(untrusted('typed-array-modified.js'));
        });
        it('should support setting in bound index values on subclasses', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
            });

            env.evaluate(untrusted('typed-array-subclass.js'));
        });
        it('should support setting in bound index values on subclasses, when maxPerfMode is true', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
                maxPerfMode: true,
            });

            env.evaluate(untrusted('typed-array-subclass.js'));
        });
        it('should treat out of bound index access as undefined', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
            });

            env.evaluate(untrusted('typed-array-out-of-bound.js'));
        });
        it('should treat out of bound index access as undefined, when maxPerfMode is true', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
                maxPerfMode: true,
            });

            env.evaluate(untrusted('typed-array-out-of-bound.js'));
        });
        it('should support subarray method', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
            });

            env.evaluate(untrusted('typed-array-subarray.js'));
        });
        it('should support subarray method, when maxPerfMode is true', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
                maxPerfMode: true,
            });

            env.evaluate(untrusted('typed-array-subarray.js'));
        });
    });

    describe('URL:', () => {
        beforeEach(createBaseLineMaxCompatModeEnvironment);

        it('can create a typed array blob url', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
            });
            env.evaluate(untrusted('url-typed-array.js'));
        });
        it('can create a typed array blob url, when maxPerfMode is true', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
                maxPerfMode: true,
            });
            env.evaluate(untrusted('url-typed-array.js'));
        });
        it('can create an svg blob url', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
            });

            env.evaluate(untrusted('url-svg.js'));
        });
        it('can create an svg blob url, when maxPerfMode is true', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
                maxPerfMode: true,
            });
            env.evaluate(untrusted('url-svg.js'));
        });

        it('can create an html blob url', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
            });

            env.evaluate(untrusted('url-html.js'));
        });
        it('can create an html blob url, when maxPerfMode is true', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
                maxPerfMode: true,
            });
            env.evaluate(untrusted('url-html.js'));
        });

        it('can create an xml blob url', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
            });

            env.evaluate(untrusted('url-xml.js'));
        });
        it('can create an xml blob url, when maxPerfMode is true', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
                maxPerfMode: true,
            });
            env.evaluate(untrusted('url-xml.js'));
        });

        it('can create a File blob url', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
            });

            env.evaluate(untrusted('url-file-blob.js'));
        });
        it('can create a File blob url, when maxPerfMode is true', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
                maxPerfMode: true,
            });
            env.evaluate(untrusted('url-file-blob.js'));
        });
    });

    describe('createImageBitmap:', () => {
        beforeEach(createBaseLineMaxCompatModeEnvironment);

        it('can create an ImageBitmap from a Blob', (done) => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ done, expect }),
            });

            env.evaluate(untrusted('create-imagebitmap-blob.js'));
        });
        it('can create an ImageBitmap from a Blob, when maxPerfMode is true', (done) => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ done, expect }),
                maxPerfMode: true,
            });

            env.evaluate(untrusted('create-imagebitmap-blob.js'));
        });

        it('can create an ImageBitmap from an ImageData', (done) => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ done, expect }),
            });

            env.evaluate(untrusted('create-imagebitmap-imagedata.js'));
        });
        it('can create an ImageBitmap from an ImageData, when maxPerfMode is true', (done) => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ done, expect }),
                maxPerfMode: true,
            });

            env.evaluate(untrusted('create-imagebitmap-imagedata.js'));
        });
    });

    describe('XMLHttpRequest:send:', () => {
        beforeEach(createBaseLineMaxCompatModeEnvironment);

        it('can use xhr send', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
            });

            env.evaluate(untrusted('xhr-send.js'));
        });
        it('can use xhr send, when maxPerfMode is true', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
                maxPerfMode: true,
            });

            env.evaluate(untrusted('xhr-send.js'));
        });
    });

    describe('fetch:', () => {
        beforeEach(createBaseLineMaxCompatModeEnvironment);

        it('can use fetch', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
            });

            env.evaluate(untrusted('fetch.js'));
        });
        it('can use fetch, when maxPerfMode is true', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
                maxPerfMode: true,
            });

            env.evaluate(untrusted('fetch.js'));
        });
    });

    describe('Request:', () => {
        beforeEach(createBaseLineMaxCompatModeEnvironment);

        it('can create Request', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
            });

            env.evaluate(untrusted('request.js'));
        });
        it('can create Request, when maxPerfMode is true', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
                maxPerfMode: true,
            });

            env.evaluate(untrusted('request.js'));
        });
    });

    describe('Response:', () => {
        beforeEach(createBaseLineMaxCompatModeEnvironment);

        it('can create Response', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
            });

            env.evaluate(untrusted('response.js'));
        });
        it('can create Response, when maxPerfMode is true', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
                maxPerfMode: true,
            });

            env.evaluate(untrusted('response.js'));
        });
    });

    describe('FileSaver library:', () => {
        beforeEach(createBaseLineMaxCompatModeEnvironment);

        it('can create a blob to save as', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
            });

            env.evaluate(`
                ${untrusted('FileSaver.js')}
                ${untrusted('FileSaver-blob.js')}
            `);
        });
        it('can create a blob to save as, when maxPerfMode is true', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
                maxPerfMode: true,
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
        it('can create a file to save as, when maxPerfMode is true', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
                maxPerfMode: true,
            });

            env.evaluate(`
                ${untrusted('FileSaver.js')}
                ${untrusted('FileSaver-file.js')}
            `);
        });
    });

    describe('Identity discontinuity:', () => {
        beforeEach(createBaseLineMaxCompatModeEnvironment);

        function getBlueBlob() {
            return new Blob([new Uint8Array([1, 2, 3])], { type: 'text/plain;charset=utf-8' });
        }

        it('can save blue blob', (done) => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ done, expect, getBlueBlob }),
            });

            env.evaluate(`
                ${untrusted('FileSaver.js')}
                const transferBlueBlob = false;
                const expectedToThrow = false;
                ${untrusted('FileSaver-blue-blob.js')}
            `);
        });
        it('fails to save blue blob, when maxPerfMode is true and blob is not transferred to red', (done) => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ done, expect, getBlueBlob }),
                maxPerfMode: true,
            });

            env.evaluate(`
                ${untrusted('FileSaver.js')}
                const transferBlueBlob = false;
                const expectedToThrow = true;
                ${untrusted('FileSaver-blue-blob.js')}
            `);
        });
        it('can save blue blob, when maxPerfMode is true and blob is transferred to red', (done) => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ done, expect, getBlueBlob }),
                maxPerfMode: true,
            });

            env.evaluate(`
                ${untrusted('FileSaver.js')}
                const transferBlueBlob = true;
                const expectedToThrow = false;
                ${untrusted('FileSaver-blue-blob.js')}
            `);
        });
    });
});
