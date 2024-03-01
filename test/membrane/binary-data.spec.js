import createVirtualEnvironment from '@locker/near-membrane-dom';

function createEnvironmentThatAlwaysRemapsTypedArray() {
    const alwayRemapping = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ expect, OuterUint8Array: Uint8Array }),
    });

    alwayRemapping.evaluate(`
        const u8a = new Uint8Array();
        expect(u8a instanceof OuterUint8Array).toBe(true);
    `);
}
// Safari Technology Preview may not have support for Atomics enabled.
if (typeof Atomics !== 'undefined') {
    describe('Atomics', () => {
        beforeEach(createEnvironmentThatAlwaysRemapsTypedArray);

        it('operates on atomic-friendly typed arrays', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
            });

            env.evaluate(`
                const ab = new ArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
                const i32a = new Int32Array(ab);
                i32a[0] = 9;
                Atomics.add(i32a, 0, 33); // 42
                Atomics.and(i32a, 0, 1); // 0
                Atomics.exchange(i32a, 0, 42); // 42
                Atomics.or(i32a, 0, 1); // 43
                Atomics.store(i32a, 0, 18); // 18
                Atomics.sub(i32a, 0, 10);
                Atomics.xor(i32a, 0, 1);
                expect(Atomics.load(i32a, 0)).toBe(9);
            `);
        });

        it('fails to operate on atomic-friendly typed arrays, when typed arrays are not remapped', () => {
            const env = createVirtualEnvironment(window, {
                endowments: Object.getOwnPropertyDescriptors({ expect }),
                remapTypedArrays: false,
            });

            expect(() =>
                env.evaluate(`
                const ab = new ArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
                const i32a = new Int32Array(ab);
                i32a[0] = 9;
                Atomics.add(i32a, 0, 33); // 42
                Atomics.and(i32a, 0, 1); // 0
                Atomics.exchange(i32a, 0, 42); // 42
                Atomics.or(i32a, 0, 1); // 43
                Atomics.store(i32a, 0, 18); // 18
                Atomics.sub(i32a, 0, 10);
                Atomics.xor(i32a, 0, 1);
                expect(Atomics.load(i32a, 0)).toBe(9);
            `)
            ).toThrow();
        });
    });
}

describe('Blob', () => {
    beforeEach(createEnvironmentThatAlwaysRemapsTypedArray);

    it('encodes blobs from typed arrays', (done) => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ done, expect }),
        });

        env.evaluate(`
            const a = new Uint8Array([97, 98, 99]);
            const b = new Blob([a], { type: 'application/octet-stream' });
            b.text().then((output) => {
                expect(output).toBe('abc');
                done();
            });
        `);
    });
    it('fails to encode blobs from typed arrays, when typed arrays are not remapped', () => {
        const env = createVirtualEnvironment(window, {
            remapTypedArrays: false,
        });

        env.evaluate(`
            const a = new Uint8Array([97, 98, 99]);
            const b = new Blob([a], { type: 'application/octet-stream' });
        `);
    });
});

describe('Crypto', () => {
    beforeEach(createEnvironmentThatAlwaysRemapsTypedArray);

    it('creates random values from typed arrays', (done) => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ done, expect }),
        });

        env.evaluate(`
            expect(() => {
                crypto.getRandomValues(new Uint8Array(1));
            }).not.toThrow();
            async function f() {
                const algorithm = { name: "RSA-OAEP" };
                const data = new Uint8Array([255]);
                const keyPair = await window.crypto.subtle.generateKey(
                  {
                    name: "RSA-OAEP",
                    modulusLength: 4096,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-256",
                  },
                  true,
                  ["encrypt", "decrypt"],
                );

                const encrypted = await crypto.subtle.encrypt(
                  algorithm,
                  keyPair.publicKey,
                  data
                );

                const decrypted = await crypto.subtle.decrypt(
                  algorithm,
                  keyPair.privateKey,
                  encrypted
                );
            }

            f().then(done);
        `);
    });
    it('creates random values from typed arrays, when typed arrays are not remapped', (done) => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ done, expect }),
            remapTypedArrays: false,
        });

        env.evaluate(`
            expect(() => {
                crypto.getRandomValues(new Uint8Array(1));
            }).not.toThrow();
            async function f() {
                const algorithm = { name: "RSA-OAEP" };
                const data = new Uint8Array([255]);
                const keyPair = await window.crypto.subtle.generateKey(
                  {
                    name: "RSA-OAEP",
                    modulusLength: 4096,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-256",
                  },
                  true,
                  ["encrypt", "decrypt"],
                );

                const encrypted = await crypto.subtle.encrypt(
                  algorithm,
                  keyPair.publicKey,
                  data
                );

                const decrypted = await crypto.subtle.decrypt(
                  algorithm,
                  keyPair.privateKey,
                  encrypted
                );
            }

            f().then(done);
        `);
    });
    it('ignores the presense of crypto in endowments if remapTypedArrays is false', (done) => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ Crypto, crypto, done, expect }),
            remapTypedArrays: false,
        });

        env.evaluate(`
            expect(() => {
                crypto.getRandomValues(new Uint8Array(1));
            }).not.toThrow();
            async function f() {
                const algorithm = { name: "RSA-OAEP" };
                const data = new Uint8Array([255]);
                const keyPair = await window.crypto.subtle.generateKey(
                  {
                    name: "RSA-OAEP",
                    modulusLength: 4096,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-256",
                  },
                  true,
                  ["encrypt", "decrypt"],
                );

                const encrypted = await crypto.subtle.encrypt(
                  algorithm,
                  keyPair.publicKey,
                  data
                );

                const decrypted = await crypto.subtle.decrypt(
                  algorithm,
                  keyPair.privateKey,
                  encrypted
                );
            }

            f().then(done);
        `);
    });
});

describe('DataView', () => {
    beforeEach(createEnvironmentThatAlwaysRemapsTypedArray);

    it('should not support index access', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            const buffer = new ArrayBuffer(8);
            const dataView = new DataView(buffer);
            expect(dataView[0]).toBe(undefined);
        `);
    });
    it('should not support index access, when typed arrays are not remapped', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            remapTypedArrays: false,
        });

        env.evaluate(`
            const buffer = new ArrayBuffer(8);
            const dataView = new DataView(buffer);
            expect(dataView[0]).toBe(undefined);
        `);
    });
});

describe('FileReader', () => {
    beforeEach(createEnvironmentThatAlwaysRemapsTypedArray);

    it('reads from blobs created from typed arrays', (done) => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ done, expect }),
        });

        env.evaluate(`
            const source = new Uint8Array([97, 98, 99]);
            const blob = new Blob([source]);
            const reader = new FileReader();

            reader.onload = (event) => {
                expect(reader.result.byteLength).toBe(source.length);
                expect(reader.result).toBeInstanceOf(ArrayBuffer);
                done();
            };
            reader.readAsArrayBuffer(blob);
        `);
    });
    it('reads from blobs created from typed arrays, when typed arrays are not remapped', (done) => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ done, expect }),
            remapTypedArrays: false,
        });

        env.evaluate(`
            const source = new Uint8Array([97, 98, 99]);
            const blob = new Blob([source]);
            const reader = new FileReader();

            reader.onload = (event) => {
                expect(reader.result.byteLength).toBe(source.length);
                expect(reader.result).toBeInstanceOf(ArrayBuffer);
                done();
            };
            reader.readAsArrayBuffer(blob);
        `);
    });
});

describe('TypedArray', () => {
    beforeEach(createEnvironmentThatAlwaysRemapsTypedArray);

    it('should support in bound index access', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            const buffer = new ArrayBuffer(8);
            const bigIntTypedArrays = [
                new BigInt64Array(buffer),
                new BigUint64Array(buffer),
            ];
            for (const bigIntTypedArray of bigIntTypedArrays) {
                expect(typeof bigIntTypedArray[0]).toBe('bigint');
            }
            const typedArrays = [
                new Float32Array(buffer),
                new Float64Array(buffer),
                new Int8Array(buffer),
                new Int16Array(buffer),
                new Int32Array(buffer),
                new Uint8Array(buffer),
                new Uint8ClampedArray(buffer),
                new Uint16Array(buffer),
                new Uint32Array(buffer),
            ];
            for (const typedArray of typedArrays) {
                expect(typeof typedArray[0]).toBe('number');
            }
        `);
    });
    it('should support in bound index access, when typed arrays are not remapped', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            remapTypedArrays: false,
        });

        env.evaluate(`
            const buffer = new ArrayBuffer(8);
            const bigIntTypedArrays = [
                new BigInt64Array(buffer),
                new BigUint64Array(buffer),
            ];
            for (const bigIntTypedArray of bigIntTypedArrays) {
                expect(typeof bigIntTypedArray[0]).toBe('bigint');
            }
            const typedArrays = [
                new Float32Array(buffer),
                new Float64Array(buffer),
                new Int8Array(buffer),
                new Int16Array(buffer),
                new Int32Array(buffer),
                new Uint8Array(buffer),
                new Uint8ClampedArray(buffer),
                new Uint16Array(buffer),
                new Uint32Array(buffer),
            ];
            for (const typedArray of typedArrays) {
                expect(typeof typedArray[0]).toBe('number');
            }
        `);
    });
    it('should support in bound index access with modified prototypes', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            const buffer = new ArrayBuffer(8);
            const typedArrays = [
                new BigInt64Array(buffer),
                new BigUint64Array(buffer),
                new Float32Array(buffer),
                new Float64Array(buffer),
                new Int8Array(buffer),
                new Int16Array(buffer),
                new Int32Array(buffer),
                new Uint8Array(buffer),
                new Uint8ClampedArray(buffer),
                new Uint16Array(buffer),
                new Uint32Array(buffer),
            ];
            for (const typedArray of typedArrays) {
                Reflect.setPrototypeOf(typedArray, { length: 0 });
                expect(typedArray[0]).toBeDefined();
            }
        `);
    });
    it('should support in bound index access with modified prototypes, when typed arrays are not remapped', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            remapTypedArrays: false,
        });

        env.evaluate(`
            const buffer = new ArrayBuffer(8);
            const typedArrays = [
                new BigInt64Array(buffer),
                new BigUint64Array(buffer),
                new Float32Array(buffer),
                new Float64Array(buffer),
                new Int8Array(buffer),
                new Int16Array(buffer),
                new Int32Array(buffer),
                new Uint8Array(buffer),
                new Uint8ClampedArray(buffer),
                new Uint16Array(buffer),
                new Uint32Array(buffer),
            ];
            for (const typedArray of typedArrays) {
                Reflect.setPrototypeOf(typedArray, { length: 0 });
                expect(typedArray[0]).toBeDefined();
            }
        `);
    });
    it('should support setting in bound index values on subclasses', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            const buffer = new ArrayBuffer(8);
            const Ctors = [
                BigInt64Array,
                BigUint64Array,
                Float32Array,
                Float64Array,
                Int8Array,
                Int16Array,
                Int32Array,
                Uint8Array,
                Uint8ClampedArray,
                Uint16Array,
                Uint32Array,
            ];
            for (const Ctor of Ctors) {
                class Subclass extends Ctor {
                    constructor(arrayBuffer) {
                        super(arrayBuffer);
                        this[0] = this[0];
                    }
                }
                const subclassed = new Subclass(buffer);
                expect(subclassed[0]).toBeDefined();
            }
        `);
    });
    it('should support setting in bound index values on subclasses, when typed arrays are not remapped', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            remapTypedArrays: false,
        });

        env.evaluate(`
            const buffer = new ArrayBuffer(8);
            const Ctors = [
                BigInt64Array,
                BigUint64Array,
                Float32Array,
                Float64Array,
                Int8Array,
                Int16Array,
                Int32Array,
                Uint8Array,
                Uint8ClampedArray,
                Uint16Array,
                Uint32Array,
            ];
            for (const Ctor of Ctors) {
                class Subclass extends Ctor {
                    constructor(arrayBuffer) {
                        super(arrayBuffer);
                        this[0] = this[0];
                    }
                }
                const subclassed = new Subclass(buffer);
                expect(subclassed[0]).toBeDefined();
            }
        `);
    });
    it('should treat out of bound index access as undefined', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            const buffer = new ArrayBuffer(8);
            const typedArrays = [
                new BigInt64Array(buffer),
                new BigUint64Array(buffer),
                new Float32Array(buffer),
                new Float64Array(buffer),
                new Int8Array(buffer),
                new Int16Array(buffer),
                new Int32Array(buffer),
                new Uint8Array(buffer),
                new Uint8ClampedArray(buffer),
                new Uint16Array(buffer),
                new Uint32Array(buffer),
            ];
            for (const typedArray of typedArrays) {
                expect(typedArray[-1]).toBe(undefined);
                expect(typedArray[1000]).toBe(undefined);
            }
        `);
    });
    it('should treat out of bound index access as undefined, when typed arrays are not remapped', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            remapTypedArrays: false,
        });

        env.evaluate(`
            const buffer = new ArrayBuffer(8);
            const typedArrays = [
                new BigInt64Array(buffer),
                new BigUint64Array(buffer),
                new Float32Array(buffer),
                new Float64Array(buffer),
                new Int8Array(buffer),
                new Int16Array(buffer),
                new Int32Array(buffer),
                new Uint8Array(buffer),
                new Uint8ClampedArray(buffer),
                new Uint16Array(buffer),
                new Uint32Array(buffer),
            ];
            for (const typedArray of typedArrays) {
                expect(typedArray[-1]).toBe(undefined);
                expect(typedArray[1000]).toBe(undefined);
            }
        `);
    });
    it('should support subarray method', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            const buffer = new ArrayBuffer(8);
            const typedArrays = [
                new BigInt64Array(buffer),
                new BigUint64Array(buffer),
                new Float32Array(buffer),
                new Float64Array(buffer),
                new Int8Array(buffer),
                new Int16Array(buffer),
                new Int32Array(buffer),
                new Uint8Array(buffer),
                new Uint8ClampedArray(buffer),
                new Uint16Array(buffer),
                new Uint32Array(buffer),
            ];
            for (const typedArray of typedArrays) {
                expect(() => typedArray.subarray(0)).not.toThrow();
            }
        `);
    });
    it('should support subarray method, when typed arrays are not remapped', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            remapTypedArrays: false,
        });

        env.evaluate(`
            const buffer = new ArrayBuffer(8);
            const typedArrays = [
                new BigInt64Array(buffer),
                new BigUint64Array(buffer),
                new Float32Array(buffer),
                new Float64Array(buffer),
                new Int8Array(buffer),
                new Int16Array(buffer),
                new Int32Array(buffer),
                new Uint8Array(buffer),
                new Uint8ClampedArray(buffer),
                new Uint16Array(buffer),
                new Uint32Array(buffer),
            ];
            for (const typedArray of typedArrays) {
                expect(() => typedArray.subarray(0)).not.toThrow();
            }
        `);
    });
});

describe('URL', () => {
    beforeEach(createEnvironmentThatAlwaysRemapsTypedArray);

    it('can create a typed array blob url', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });
        env.evaluate(`
            const source = new Uint8Array([97, 98, 99]);
            const blob = new Blob([source]);
            expect(() => {
                URL.createObjectURL(blob);
            }).not.toThrow();
        `);
    });
    it('can create a typed array blob url, when typed arrays are not remapped', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            remapTypedArrays: false,
        });
        env.evaluate(`
            const source = new Uint8Array([97, 98, 99]);
            const blob = new Blob([source]);
            expect(() => {
                URL.createObjectURL(blob);
            }).not.toThrow();
        `);
    });
    it('can create an svg blob url', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            const content = \`
                <svg id="rectangle" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" height="100">
                <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="blue" />
                </svg>\`;

            const blob = new Blob([content], { type: 'image/svg+xml' });
            expect(() => {
                URL.createObjectURL(blob);
            }).not.toThrow();
        `);
    });
    it('can create an svg blob url, when typed arrays are not remapped', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            remapTypedArrays: false,
        });
        env.evaluate(`
            const content = \`
            <svg id="rectangle" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" height="100">
            <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="blue" />
            </svg>\`;

            const blob = new Blob([content], { type: 'image/svg+xml' });
            expect(() => {
                URL.createObjectURL(blob);
            }).not.toThrow();
        `);
    });

    it('can create an html blob url', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            const blob = new Blob(['<h1>Hello World</h1>'], { type: 'text/html' });
            expect(() => {
                URL.createObjectURL(blob);
            }).not.toThrow();
        `);
    });
    it('can create an html blob url, when typed arrays are not remapped', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            remapTypedArrays: false,
        });
        env.evaluate(`
            const blob = new Blob(['<h1>Hello World</h1>'], { type: 'text/html' });
            expect(() => {
                URL.createObjectURL(blob);
            }).not.toThrow();
        `);
    });

    it('can create an xml blob url', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            const blob = new Blob(['<div><span>foo</span></div>'], { type: 'text/xml' });
            expect(() => {
                URL.createObjectURL(blob);
            }).not.toThrow();
        `);
    });
    it('can create an xml blob url, when typed arrays are not remapped', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            remapTypedArrays: false,
        });
        env.evaluate(`
            const blob = new Blob(['<div><span>foo</span></div>'], { type: 'text/xml' });
            expect(() => {
                URL.createObjectURL(blob);
            }).not.toThrow();
        `);
    });

    it('can create a File blob url', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            const f = new File(
                ['<p>PEW</p><script src="http://localhost:9876/resource/test"></script>'],
                'foo.txt'
            );
            expect(() => {
                URL.createObjectURL(f);
            }).not.toThrow();
        `);
    });
    it('can create a File blob url, when typed arrays are not remapped', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            remapTypedArrays: false,
        });
        env.evaluate(`
            const f = new File(
                ['<p>PEW</p><script src="http://localhost:9876/resource/test"></script>'],
                'foo.txt'
            );
            expect(() => {
                URL.createObjectURL(f);
            }).not.toThrow();
        `);
    });
});

describe('FileSaver library', () => {
    beforeEach(createEnvironmentThatAlwaysRemapsTypedArray);

    /* -- Begin Library Code --*/
    /*
     * FileSaver.js
     * A saveAs() FileSaver implementation.
     *
     * By Eli Grey, http://eligrey.com
     *
     * License : https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md (MIT)
     * source  : http://purl.eligrey.com/github/FileSaver.js
     */
    // The one and only way of getting global scope in all environments
    // https://stackoverflow.com/q/3277182/1008999

    const FILE_SAVER_LIBRARY_SRC = `function bom(blob, opts) {
          if (typeof opts === 'undefined') opts = {
            autoBom: false
          };else if (typeof opts !== 'object') {
            console.warn('Deprecated: Expected third argument to be a object');
            opts = {
              autoBom: !opts
            };
          } // prepend BOM for UTF-8 XML and text/* types (including HTML)
          // note: your browser will automatically convert UTF-16 U+FEFF to EF BB BF

          if (opts.autoBom && /^\\s*(?:text\\/\\S*|application\\/xml|\\S*\\/\\S*\\+xml)\\s*;.*charset\\s*=\\s*utf-8/i.test(blob.type)) {
            return new Blob([String.fromCharCode(0xFEFF), blob], {
              type: blob.type
            });
          }

          return blob;
        }

        function download(url, name, opts) {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', url);
          xhr.responseType = 'blob';

          xhr.onload = function () {
            saveAs(xhr.response, name, opts);
          };

          xhr.onerror = function () {
            console.error('could not download file');
          };

          xhr.send();
        }

        function corsEnabled(url) {
          var xhr = new XMLHttpRequest(); // use sync to avoid popup blocker

          xhr.open('HEAD', url, false);

          try {
            xhr.send();
          } catch (e) {}

          return xhr.status >= 200 && xhr.status <= 299;
        }


        function click(node) {
          try {
            node.dispatchEvent(new MouseEvent('click'));
          } catch (e) {
            var evt = document.createEvent('MouseEvents');
            evt.initMouseEvent('click', true, true, window, 0, 0, 0, 80, 20, false, false, false, false, 0, null);
            node.dispatchEvent(evt);
          }
        } // Detect WebView inside a native macOS app by ruling out all browsers
        // We just need to check for 'Safari' because all other browsers (besides Firefox) include that too
        // https://www.whatismybrowser.com/guides/the-latest-user-agent/macos


        var isMacOSWebView = /Macintosh/.test(navigator.userAgent) && /AppleWebKit/.test(navigator.userAgent) && !/Safari/.test(navigator.userAgent);
        var saveAs = window.saveAs || ( // probably in some web worker
        typeof window !== 'object' || window !== window ? function saveAs() {}
        /* noop */
        // Use download attribute first if possible (#193 Lumia mobile) unless this is a macOS WebView
        : 'download' in HTMLAnchorElement.prototype && !isMacOSWebView ? function saveAs(blob, name, opts) {
          var URL = window.URL || window.webkitURL;
          var a = document.createElement('a');
          name = name || blob.name || 'download';
          a.download = name;
          a.rel = 'noopener'; // tabnabbing
          // TODO: detect chrome extensions & packaged apps
          // a.target = '_blank'

          if (typeof blob === 'string') {
            // Support regular links
            a.href = blob;

            if (a.origin !== location.origin) {
              corsEnabled(a.href) ? download(blob, name, opts) : click(a, a.target = '_blank');
            } else {
              click(a);
            }
          } else {
            // Support blobs
            a.href = URL.createObjectURL(blob);
            setTimeout(function () {
              URL.revokeObjectURL(a.href);
            }, 4E4); // 40s

            setTimeout(function () {
              click(a);
            }, 0);
          }
        } // Use msSaveOrOpenBlob as a second approach
        : 'msSaveOrOpenBlob' in navigator ? function saveAs(blob, name, opts) {
          name = name || blob.name || 'download';

          if (typeof blob === 'string') {
            if (corsEnabled(blob)) {
              download(blob, name, opts);
            } else {
              var a = document.createElement('a');
              a.href = blob;
              a.target = '_blank';
              setTimeout(function () {
                click(a);
              });
            }
          } else {
            navigator.msSaveOrOpenBlob(bom(blob, opts), name);
          }
        } // Fallback to using FileReader and a popup
        : function saveAs(blob, name, opts, popup) {
          // Open a popup immediately do go around popup blocker
          // Mostly only available on user interaction and the fileReader is async so...
          popup = popup || open('', '_blank');

          if (popup) {
            popup.document.title = popup.document.body.innerText = 'downloading...';
          }

          if (typeof blob === 'string') return download(blob, name, opts);
          var force = blob.type === 'application/octet-stream';

          var isSafari = /constructor/i.test(window.HTMLElement) || window.safari;

          var isChromeIOS = /CriOS\\/[\\d]+/.test(navigator.userAgent);

          if ((isChromeIOS || force && isSafari || isMacOSWebView) && typeof FileReader !== 'undefined') {
            // Safari doesn't allow downloading of blob URLs
            var reader = new FileReader();

            reader.onloadend = function () {
              var url = reader.result;
              url = isChromeIOS ? url : url.replace(/^data:[^;]*;/, 'data:attachment/file;');
              if (popup) popup.location.href = url;else location = url;
              popup = null; // reverse-tabnabbing #460
            };

            reader.readAsDataURL(blob);
          } else {
            var URL = window.URL || window.webkitURL;
            var url = URL.createObjectURL(blob);
            if (popup) popup.location = url;else location.href = url;
            popup = null; // reverse-tabnabbing #460

            setTimeout(function () {
              URL.revokeObjectURL(url);
            }, 4E4); // 40s
          }
        });
        window.saveAs = saveAs.saveAs = saveAs;
    `;
    /* -- End Library Code --*/

    it('can create a blob to save as', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            ${FILE_SAVER_LIBRARY_SRC}

            const blob = new Blob(['Hello, world!'], {type: 'text/plain;charset=utf-8'});
            expect(() => {
                saveAs(blob, 'hello world.txt');
            }).not.toThrow();

            const blobB = new Blob([new Uint8Array([97, 98, 99])], {type: 'text/plain;charset=utf-8'});
            expect(() => {
                saveAs(blobB, 'binary.txt');
            }).not.toThrow();
        `);
    });
    it('can create a blob to save as, when typed arrays are not remapped', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            remapTypedArrays: false,
        });

        env.evaluate(`
            ${FILE_SAVER_LIBRARY_SRC}

            const blob = new Blob(['Hello, world!'], {type: 'text/plain;charset=utf-8'});
            expect(() => {
                saveAs(blob, 'hello world.txt');
            }).not.toThrow();

            const blobB = new Blob([new Uint8Array([97, 98, 99])], {type: 'text/plain;charset=utf-8'});
            expect(() => {
                saveAs(blobB, 'binary.txt');
            }).not.toThrow();
        `);
    });

    it('can create a file to save as', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            ${FILE_SAVER_LIBRARY_SRC}

            const file = new File(['Hello, world!'], 'plaintext.txt', {type: 'text/plain;charset=utf-8'});
            expect(() => {
                saveAs(file, 'plaintext.txt');
            }).not.toThrow();

            const fileB = new File([new Uint8Array([97, 98, 99])], 'binary.txt', {type: 'text/plain;charset=utf-8'});
            expect(() => {
                saveAs(fileB, 'binary.txt');
            }).not.toThrow();
        `);
    });
    it('can create a file to save as, when typed arrays are not remapped', () => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
            remapTypedArrays: false,
        });

        env.evaluate(`
            ${FILE_SAVER_LIBRARY_SRC}

            const file = new File(['Hello, world!'], 'plaintext.txt', {type: 'text/plain;charset=utf-8'});
            expect(() => {
                saveAs(file, 'plaintext.txt');
            }).not.toThrow();

            const fileB = new File([new Uint8Array([97, 98, 99])], 'binary.txt', {type: 'text/plain;charset=utf-8'});
            expect(() => {
                saveAs(fileB, 'binary.txt');
            }).not.toThrow();
        `);
    });
});
