import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('object-branding', () => {
    it('should respect branding of target', () => {
        const env = createVirtualEnvironment(window, window, {
            endowments: { expect },
        });
        env.evaluate(`
            const { toString: ObjectProtoToString } = Object.prototype;

            function getToStringTag(object) {
                return ObjectProtoToString.call(object).slice(8, -1);
            }

            expect(getToStringTag([])).toBe('Array');
            expect(getToStringTag(new Boolean())).toBe('Boolean');
            expect(getToStringTag(function (){})).toBe('Function');
            expect(getToStringTag(async ()=>{})).toBe('AsyncFunction');
            expect(getToStringTag(function * (){})).toBe('GeneratorFunction');
            expect(getToStringTag(async function * (){})).toBe('AsyncGeneratorFunction');
            expect(getToStringTag(new Date())).toBe('Date');
            expect(getToStringTag({})).toEqual('Object');
            expect(getToStringTag(new Number(1))).toBe('Number');
            expect(getToStringTag(/a/)).toBe('RegExp');
            expect(getToStringTag(new String('Hello!'))).toBe('String');

            const buffer = new ArrayBuffer(8);
            expect(getToStringTag(buffer)).toBe('ArrayBuffer');
            expect(getToStringTag(new Float32Array(buffer))).toBe('Float32Array');
            expect(getToStringTag(new Float64Array(buffer))).toBe('Float64Array');
            expect(getToStringTag(new Int8Array(buffer))).toBe('Int8Array');
            expect(getToStringTag(new Int16Array(buffer))).toBe('Int16Array');
            expect(getToStringTag(new Int32Array(buffer))).toBe('Int32Array');
            expect(getToStringTag(new Uint8Array(buffer))).toBe('Uint8Array');
            expect(getToStringTag(new Uint8ClampedArray(buffer))).toBe('Uint8ClampedArray');
            expect(getToStringTag(new Uint16Array(buffer))).toBe('Uint16Array');
            expect(getToStringTag(new Uint32Array(buffer))).toBe('Uint32Array');

            const custom = { [Symbol.toStringTag]: 'Custom' };
            expect(getToStringTag(custom)).toBe('Custom');

            const inheritedCustom = Object.create(custom);
            expect(getToStringTag(inheritedCustom)).toBe('Custom');

            const overwrittenCustom = Object.create(custom, {
                [Symbol.toStringTag]: { value: 'Overwritten' },
            });
            expect(getToStringTag(overwrittenCustom)).toBe('Overwritten');
        `);
    });
});
