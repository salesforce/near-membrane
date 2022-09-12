import createVirtualEnvironment from '@locker/near-membrane-dom';

const bar = Object.create(null, {
    x: { value: 1 },
    z: { value: 5, writable: true },
});
let foo;
function saveFoo(arg) {
    foo = arg;
}

describe('null __proto__', () => {
    it('should work for get trap', () => {
        expect.assertions(4);

        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ bar, saveFoo, expect }),
        });

        env.evaluate(`
            const foo = Object.create(null, {
                y: { value: 2 }
            });
            saveFoo(foo);
            expect(bar.x).toBe(1);
            expect(bar.y).toBe(undefined);
        `);

        expect(foo.x).toBe(undefined);
        expect(foo.y).toBe(2);
    });
    it('should work for set trap', () => {
        expect.assertions(6);

        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ bar, saveFoo, expect }),
        });

        env.evaluate(`
            const foo = Object.create(null, {
                x: { value: 2 },
                y: { value: 3, writable: true }
            });
            saveFoo(foo);
            expect(Reflect.set(bar, 'x', 2)).toBe(false); // non-writable
            expect(Reflect.set(bar, 'expando', 3)).toBe(true);
            expect(Reflect.set(bar, 'z', 4)).toBe(true);
        `);

        expect(Reflect.set(foo, 'x', 5)).toBe(false); // non-writable
        expect(Reflect.set(foo, 'expando', 6)).toBe(true);
        expect(Reflect.set(foo, 'y', 7)).toBe(true);
    });
    it('should work for has trap', () => {
        expect.assertions(4);

        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ bar, saveFoo, expect }),
        });

        env.evaluate(`
            const foo = Object.create(null, {
                y: { value: 2, writable: true }
            });
            saveFoo(foo);
            expect('x' in bar).toBe(true);
            expect('y' in bar).toBe(false);
        `);

        expect('x' in foo).toBe(false);
        expect('y' in foo).toBe(true);
    });
});
