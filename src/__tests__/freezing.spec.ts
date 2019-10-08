import createSecureEnvironment from '../node-realm';
import { getGlobalThis } from '../shared';

const globalThis = getGlobalThis();

describe('Freezing', () => {
    describe('before creating the sandbox', () => {
        it('should be observed from within the sandbox', function() {
            globalThis.bar = { a:1, b: 2 };
            Object.freeze(globalThis.bar)
            const secureGlobalThis = createSecureEnvironment((v) => v);
            expect(Object.isExtensible(globalThis.bar)).toBe(false);
            expect(Object.isSealed(globalThis.bar)).toBe(true);
            expect(Object.isFrozen(globalThis.bar)).toBe(true);
            expect(secureGlobalThis.Object.isExtensible(secureGlobalThis.bar)).toBe(false);
            expect(secureGlobalThis.Object.isSealed(secureGlobalThis.bar)).toBe(true);
            expect(secureGlobalThis.Object.isFrozen(secureGlobalThis.bar)).toBe(true);
            expect(() => {
                secureGlobalThis.bar.c = 3;
            }).toThrowError();
            expect(secureGlobalThis.bar.c).toBe(undefined); // because it is frozen
        });
    });
    describe('after creating the sandbox', () => {
        it('should not be observed from within the sandbox', function() {
            globalThis.baz = { a:1, b: 2 };
            const secureGlobalThis = createSecureEnvironment((v) => v);
            expect(secureGlobalThis.Object.isExtensible(secureGlobalThis.baz)).toBe(true);
            expect(secureGlobalThis.Object.isSealed(secureGlobalThis.baz)).toBe(false);
            expect(secureGlobalThis.Object.isFrozen(secureGlobalThis.baz)).toBe(false);
            // freezing the raw value after being observed by the sandbox
            Object.freeze(globalThis.baz);
            expect(Object.isExtensible(globalThis.baz)).toBe(false);
            expect(Object.isSealed(globalThis.baz)).toBe(true);
            expect(Object.isFrozen(globalThis.baz)).toBe(true);
            // verifying the state of the obj from within the sandbox
            secureGlobalThis.baz.c = 3;
            expect(secureGlobalThis.Object.isExtensible(secureGlobalThis.baz)).toBe(true);
            expect(secureGlobalThis.Object.isSealed(secureGlobalThis.baz)).toBe(false);
            expect(secureGlobalThis.Object.isFrozen(secureGlobalThis.baz)).toBe(false);
            expect(secureGlobalThis.baz.c).toBe(3); // because it wasn't frozen when the shadow target was constructed
        });
    });
});
