import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('The object graph', () => {
    it('should be shadowed by a sandbox', () => {
        expect.assertions(21);

        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            'use strict';

            const originalProto = HTMLParagraphElement.prototype.__proto__;
            const newProto = {
                get x() { return 1; },
                y: 2,
                z: 3,
            };
            // making z non-writable
            Object.defineProperty(newProto, 'z', { writable: false });

            // replacing proto chain
            Object.setPrototypeOf(newProto, originalProto);
            Object.setPrototypeOf(HTMLParagraphElement.prototype, newProto);

            const elm = document.createElement('p');
            document.body.appendChild(elm);

            expect('x' in elm).toBe(true);
            expect(elm.x).toBe(1);
            expect(() => {
                elm.x = 100;
            }).toThrow();
            expect(elm.x).toBe(1);

            expect(elm.y).toBe(2);
            expect(() => {
                elm.y = 200;
            }).not.toThrow();
            expect(elm.y).toBe(200);

            expect(elm.z).toBe(3);
            expect(() => {
                elm.z = 300;
            }).toThrow();
            expect(elm.z).toBe(3);

            expect(elm.w).toBe(undefined);
            expect(() => {
                elm.w = 400;
            }).not.toThrow();
            expect(elm.w).toBe(400);
        `);

        // Mutations on the object graph in the sandbox do not leak into the outer realm
        const elm = document.querySelector('p');
        expect('w' in elm).toBe(false);
        expect(elm.w).toBe(undefined);
        expect('x' in elm).toBe(false);
        expect(elm.x).toBe(undefined);
        expect('y' in elm).toBe(false);
        expect(elm.y).toBe(undefined);
        expect('z' in elm).toBe(false);
        expect(elm.z).toBe(undefined);
    });
});
