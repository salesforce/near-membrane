import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('JSON', () => {
    it('JSON.stringify of blue objects with modified properties', () => {
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

    it('JSON.parse of red objects with modified properties', () => {
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

    it('JSON.stringify of blue objects with date and regexp properties', () => {
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
        const regexp = /a/;
        const outsideObject = { date, regexp };
        takeInside(outsideObject, JSON.stringify({ date, regexp }));
    });

    it('JSON.parse of red objects with date and regexp properties', () => {
        expect.assertions(1);

        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({
                expect,
                takeOutside(insideValue, expectedValue) {
                    // Test blue proxies.
                    expect(JSON.stringify(insideValue)).toBe(expectedValue);
                },
            }),
        });

        env.evaluate(`
            const date = new Date();
            const regexp = /a/;
            const insideObject = { date, regexp };
            takeOutside(insideObject, \`{"date":"\${date.toISOString()}","regexp":{}}\`);
        `);
    });
});
