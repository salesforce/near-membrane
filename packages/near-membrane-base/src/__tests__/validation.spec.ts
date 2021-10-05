import { validateRequiredObjects } from '../index';

describe('validateRequiredObjects()', () => {
    it('throws when globalObjectShape is missing', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);

        // @ts-ignore
        expect(() => validateRequiredObjects()).toThrow();
    });
    it('throws when globalObjectVirtualizationTarget is missing', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);

        // @ts-ignore
        expect(() => validateRequiredObjects({})).toThrow();
    });
    it('is silent and returns undefined when both objects are present', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);
        // @ts-ignore
        expect(validateRequiredObjects({}, {})).toBe(undefined);
    });
});
