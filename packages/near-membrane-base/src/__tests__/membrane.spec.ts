import { createConnector } from '../index';

describe('createConnector()', () => {
    it('throws when evaluator is missing', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);

        // @ts-ignore
        expect(() => createConnector()).toThrow();
    });
    it('returns connector function when requirements are satisfied', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);
        // eslint-disable-next-line no-eval
        const connector = createConnector(globalThis.eval);
        expect(typeof connector).toBe('function');
    });
});
