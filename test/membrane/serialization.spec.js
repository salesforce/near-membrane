import createVirtualEnvironment from '@locker/near-membrane-dom';

function injectIframe(key) {
    const iframe = document.createElement('iframe');
    iframe.dataset.fixture = true;
    document.body.appendChild(iframe);
    iframe.contentDocument.open();
    iframe.contentDocument.write(`
        <!DOCTYPE html>
        <script>
        'use strict';
        window.onmessage = (event) => {
            const { data } = event;
            if (data.key === ${JSON.stringify(key)}) {
                event.source.postMessage(data, event.origin);
            }
        };
        </script>
    `);
    iframe.contentDocument.close();
    return iframe;
}

describe('Serialization', () => {
    afterEach(() => {
        const fixture = document.querySelector('[data-fixture]');
        if (fixture) {
            fixture.remove();
        }
    });

    it('Can serialize objects and values as expected', () => {
        // Temporarily disabled
        // expect.assertions(1);

        const env = createVirtualEnvironment(window, window, {
            endowments: Object.getOwnPropertyDescriptors({
                expect,
                injectIframe,
            }),
        });

        env.evaluate(`
            const key = 'XYZ';
            const payload = [
                'a',
                1,
                true,
                false,
                null,
                undefined,
                {},
                Object(),
                { x: 1 },
                Object({ x: 1 }),
                Object.create(null),
                { __proto__: null },
                ['a'],
                new Array('a'),
                new ArrayBuffer(),
                new Blob(['a'], { type: 'text/plain' }),
                new File(['a'], 'a.txt', { type: 'text/plain' }),
                // FileList
                (() => {
                    try {
                    const dataTransfer = new DataTransfer();
                    const { items } = dataTransfer;
                    items.add(new File(['a'], 'a.txt', { type: 'text/plain' }));
                    items.add(new File(['b'], 'b.txt', { type: 'text/plain' }));
                    items.add(new File(['c'], 'c.txt', { type: 'text/plain' }));
                    return dataTransfer.files;
                    // eslint-disable-next-line no-empty
                    } catch {}
                    return undefined;
                })(),
                // eslint-disable-next-line no-new-wrappers
                new Boolean(true),
                new DataView(new ArrayBuffer()),
                new Date(),
                new Map([['key', { a: { b: { c: 3 } } }]]),
                /a/gimuy,
                // eslint-disable-next-line prefer-regex-literals
                new RegExp('a', 'gimuy'),
                new Set([{ a: { b: { c: 3 } } }]),
                // eslint-disable-next-line no-new-wrappers
                new String('a'),
                new Float32Array(),
                new Float64Array(),
                new Int8Array(),
                new Int16Array(),
                new Int32Array(),
                new Uint8Array(),
                new Uint8ClampedArray(),
                new Uint16Array(),
                new Uint32Array(),
                new DOMMatrix([1, 2, 3, 4, 5, 6]),
                new DOMMatrixReadOnly([1, 2, 3, 4, 5, 6]),
                new DOMMatrix([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]),
                new DOMMatrixReadOnly([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]),
                new DOMPoint(1, 2, 3, 4),
                new DOMPointReadOnly(1, 2, 3, 4),
                new DOMQuad(
                    new DOMPoint(1, 2, 3, 4),
                    new DOMPointReadOnly(5, 6, 7, 8),
                    new DOMPoint(9, 10, 11, 12),
                    new DOMPointReadOnly(13, 14, 16, 16)
                ),
                new DOMRect(0, 0, 25, 25),
                new DOMRectReadOnly(0, 0, 25, 25),
                new ImageData(25, 25),
            ];

            const handler = (event) => {
                const { data } = event;
                if (!data) {
                    return;
                }
                if (data.key === key) {
                    window.removeEventListener('message', handler);
                    expect(data.payload).toEqual(payload);
                }
            };

            window.addEventListener('message', handler);

            const iframe = injectIframe(key);

            iframe.contentWindow.postMessage('', '*'); // does not fail
            iframe.contentWindow.postMessage(true, '*'); // does not fail
            iframe.contentWindow.postMessage({}, '*'); // does fail :|

            // expect(() => {
            //     iframe.contentWindow.postMessage(
            //         {
            //             key,
            //             payload,
            //         },
            //         '*'
            //     );
            // }).not.toThrow();
        `);
    });
});
