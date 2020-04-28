import { evaluateSourceText } from '../../lib/browser-realm.js';

const endowments = {
    expect,
};

describe('The object graph', () => {
    it('should be shadowed by a sandbox', function() {
        // expect.assertions(3);
        evaluateSourceText(`
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
        `, { endowments });

        // Mutations on the object graph in the sandbox do not leak into the outer realm
        const elm = document.querySelector('p');
        expect(elm.x).toBe(undefined);
        expect(elm.y).toBe(undefined);
        expect(elm.z).toBe(undefined);
        expect(elm.w).toBe(undefined);
    });
});
