import { createBlueConnector, createRedConnector } from '../../dist/index.mjs.js';

describe('createBlueConnector()', () => {
    it('throws when globalObject is not provided', () => {
        expect(() => createBlueConnector()).toThrow();
    });
    it('returns connector function when globalObject is provided', () => {
        const connector = createBlueConnector(globalThis as any);
        expect(typeof connector).toBe('function');
    });
});

describe('createRedConnector()', () => {
    it('throws when evaluator is not a function', () => {
        expect(() => createRedConnector()).toThrow();
        expect(() => createRedConnector(null)).toThrow();
        expect(() => createRedConnector(undefined)).toThrow();
        expect(() => createRedConnector({})).toThrow();
    });
    it('returns connector function when requirements are satisfied', () => {
        const connector = createRedConnector(globalThis.eval);
        expect(typeof connector).toBe('function');
    });
    it('does not error in environments without globalThis', () => {
        const globalThisRef = globalThis;
        const globalThisDesc = Reflect.getOwnPropertyDescriptor(globalThisRef, 'globalThis');
        Reflect.deleteProperty(globalThisRef, 'globalThis');
        // eslint-disable-next-line no-restricted-globals
        const selfRef = self;
        const selfDesc = Reflect.getOwnPropertyDescriptor(selfRef, 'self');
        Reflect.deleteProperty(globalThisRef, 'self');
        let thrown1 = false;
        try {
            createRedConnector(globalThisRef.eval);
        } catch {
            thrown1 = true;
        }
        Reflect.defineProperty(globalThisRef, 'self', selfDesc!);
        let thrown2 = false;
        try {
            createRedConnector(globalThisRef.eval);
        } catch {
            thrown2 = true;
        }
        Reflect.defineProperty(globalThisRef, 'globalThis', globalThisDesc!);
        expect(thrown1).toBe(false);
        expect(thrown2).toBe(false);
    });
});
