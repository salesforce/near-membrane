import { createConnectorForGlobalObject } from '../index';

describe('createConnectorForGlobalObject()', () => {
    it('throws when globalObject is missing', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);

        // @ts-ignore
        expect(() => createConnectorForGlobalObject()).toThrow();
    });
    it('throws when globalObject.eval is missing', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);

        // @ts-ignore
        expect(() => createConnectorForGlobalObject({})).toThrow();
    });
    it('returns connector function when requirements are satisfied', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);
        const connector = createConnectorForGlobalObject(globalThis);
        expect(typeof connector).toBe('function');
    });
});
