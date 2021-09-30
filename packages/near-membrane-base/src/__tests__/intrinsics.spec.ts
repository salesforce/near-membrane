import { getFilteredGlobalObjectShapeDescriptors } from '../index';

describe('getFilteredGlobalObjectShapeDescriptors()', () => {
    it('ignores ES built-ins', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);
        const filteredEndowmentDescriptors = getFilteredGlobalObjectShapeDescriptors({
            Math,
        });
        expect(filteredEndowmentDescriptors.Math).toBe(undefined);
    });
    it('includes remapped ES built-ins', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);
        const filteredEndowmentDescriptors = getFilteredGlobalObjectShapeDescriptors({
            Promise,
        });
        expect(filteredEndowmentDescriptors.Promise).not.toBe(undefined);
    });
    it('should create a descriptor for non-ES built-ins', () => {
        // Ignoring "Property 'assertions' does not exist on type '{...}'."
        // @ts-ignore
        expect.assertions(1);
        const filteredEndowmentDescriptors = getFilteredGlobalObjectShapeDescriptors({
            Foo: 1,
        });
        // Ignoring
        //  "Property 'toMatchObject' does not exist on type 'Matchers<PropertyDescriptor>'."
        // @ts-ignore
        expect(filteredEndowmentDescriptors.Foo).toMatchObject({
            configurable: true,
            enumerable: true,
            value: 1,
            writable: true,
        });
    });
});
