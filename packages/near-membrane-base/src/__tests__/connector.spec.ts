import { createConnector } from '../index';

describe('createConnector()', () => {
    it('throws when evaluator is not a function', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(4);
        // @ts-ignore
        expect(() => createConnector()).toThrow();
        // @ts-ignore
        expect(() => createConnector(null)).toThrow();
        // @ts-ignore
        expect(() => createConnector(undefined)).toThrow();
        // @ts-ignore
        expect(() => createConnector({})).toThrow();
    });
    it('returns connector function when requirements are satisfied', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);
        // eslint-disable-next-line no-eval
        const connector = createConnector(globalThis.eval);
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
            createConnector(globalThisRef.eval);
        } catch {
            thrown1 = true;
        }
        Reflect.defineProperty(globalThisRef, 'self', selfDesc!);
        let thrown2 = false;
        try {
            createConnector(globalThisRef.eval);
        } catch {
            thrown2 = true;
        }
        Reflect.defineProperty(globalThisRef, 'globalThis', globalThisDesc!);
        expect(thrown1).toBe(false);
        expect(thrown2).toBe(false);
    });
});
