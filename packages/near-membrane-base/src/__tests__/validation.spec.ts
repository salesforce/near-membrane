import { validateRequiredGlobalShapeAndVirtualizationObjects } from '../index';

describe('validateRequiredGlobalShapeAndVirtualizationObjects()', () => {
    it('throws when globalObjectShape is missing', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);

        // @ts-ignore
        expect(() => validateRequiredGlobalShapeAndVirtualizationObjects()).toThrow();
    });
    it('throws when globalObjectVirtualizationTarget is missing', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);

        // @ts-ignore
        expect(() => validateRequiredGlobalShapeAndVirtualizationObjects({})).toThrow();
    });
    it('is silent and returns undefined when both objects are present', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);
        // @ts-ignore
        expect(validateRequiredGlobalShapeAndVirtualizationObjects({}, {})).toBe(undefined);
    });
});
