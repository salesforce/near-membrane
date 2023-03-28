import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('JSON', () => {
    it('stringify of blue objects with modified properties', () => {
        expect.assertions(1);

        let takeInside;
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({
                expect,
                exposeTakeInside(func) {
                    takeInside = func;
                },
            }),
        });
        env.evaluate(`
            exposeTakeInside(function takeInside(outsideValue, expectedValue) {
                // Modify red proxies.
                outsideValue.red = true;
                expect(JSON.stringify(outsideValue)).toBe(expectedValue);
            });
        `);
        const outsideObject = { blue: true };
        takeInside(outsideObject, JSON.stringify({ blue: true, red: true }));
    });

    it('stringify of blue objects with date, rect, and regexp properties', () => {
        expect.assertions(1);

        let takeInside;
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({
                expect,
                exposeTakeInside(func) {
                    takeInside = func;
                },
            }),
        });
        env.evaluate(`
            exposeTakeInside(function takeInside(outsideValue, expectedValue) {
                // Test red proxies.
                expect(JSON.stringify(outsideValue)).toBe(expectedValue);
            });
        `);
        const date = new Date();
        const rect = document.body.getBoundingClientRect();
        const regexp = /a/;
        const outsideObject = { date, rect, regexp };
        takeInside(outsideObject, JSON.stringify({ date, rect, regexp }));
    });

    it('stringify of red objects with modified properties', () => {
        expect.assertions(1);

        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({
                expect,
                takeOutside(insideValue, expectedValue) {
                    // Modify blue proxies.
                    insideValue.blue = true;
                    expect(JSON.stringify(insideValue)).toBe(expectedValue);
                },
            }),
        });
        env.evaluate(`
            const insideObject = { red: true };
            takeOutside(insideObject, JSON.stringify({ red: true, blue: true }));
        `);
    });

    it('stringify of red objects with date, rect, and regexp properties', () => {
        expect.assertions(1);

        const date = new Date();
        const rect = document.body.getBoundingClientRect();
        const regexp = /a/;
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({
                expect,
                takeOutside(insideValue) {
                    // Test blue proxies.
                    expect(JSON.stringify(insideValue)).toBe(
                        JSON.stringify({ date, rect, regexp })
                    );
                },
            }),
        });
        env.evaluate(`
            const date = new Date(${JSON.stringify(date)});
            const rect = document.body.getBoundingClientRect();
            const regexp = /a/;
            const insideObject = { date, rect, regexp };
            takeOutside(insideObject);
        `);
    });
});
