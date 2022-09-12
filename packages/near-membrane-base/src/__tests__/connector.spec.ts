import { createBlueConnector, createRedConnector } from '../index';

describe('createBlueConnector()', () => {
    it('throws when globalObject is not provided', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);
        // @ts-ignore
        expect(() => createBlueConnector()).toThrow();
    });
    it('returns connector function when globalObject is provided', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);
        const connector = createBlueConnector(globalThis as any);
        expect(typeof connector).toBe('function');
    });
});

describe('createRedConnector()', () => {
    it('throws when evaluator is not a function', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(4);
        // @ts-ignore
        expect(() => createRedConnector()).toThrow();
        // @ts-ignore
        expect(() => createRedConnector(null)).toThrow();
        // @ts-ignore
        expect(() => createRedConnector(undefined)).toThrow();
        // @ts-ignore
        expect(() => createRedConnector({})).toThrow();
    });
    it('returns connector function when requirements are satisfied', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);
        const connector = createRedConnector(globalThis.eval);
        expect(typeof connector).toBe('function');
    });
    it('does not error in environments without globalThis', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(2);
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
