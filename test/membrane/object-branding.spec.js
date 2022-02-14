import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('object-branding', () => {
    it('should get branding of target', () => {
        expect.assertions(28);

        const env = createVirtualEnvironment(window, window, {
            endowments: { expect },
        });
        env.evaluate(`
            function getToStringTag(object) {
                return Object.prototype.toString.call(object).slice(8, -1);
            }

            expect(getToStringTag([])).toBe('Array');
            expect(getToStringTag(new Array())).toBe('Array');
            expect(getToStringTag(new Boolean(true))).toBe('Boolean');
            expect(getToStringTag(function (){})).toBe('Function');
            expect(getToStringTag(async ()=>{})).toBe('AsyncFunction');
            expect(getToStringTag(function * (){})).toBe('GeneratorFunction');
            expect(getToStringTag(async function * (){})).toBe('AsyncGeneratorFunction');
            expect(getToStringTag(new Date())).toBe('Date');
            expect(getToStringTag({})).toEqual('Object');
            expect(getToStringTag(new Number(0))).toBe('Number');
            expect(getToStringTag(/a/)).toBe('RegExp');
            expect(getToStringTag(new RegExp('a'))).toBe('RegExp');
            expect(getToStringTag(new String('a'))).toBe('String');
            expect(getToStringTag(Object(Symbol('a')))).toBe('Symbol');

            const buffer = new ArrayBuffer(8);
            expect(getToStringTag(buffer)).toBe('ArrayBuffer');
            expect(getToStringTag(new DataView(buffer))).toBe('DataView');
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

    it('should get branding of with targets with null prototypes', () => {
        expect.assertions(28);

        const env = createVirtualEnvironment(window, window, {
            endowments: { expect },
        });
        env.evaluate(`
            function getToStringTag(object) {
                return Object.prototype.toString.call(object).slice(8, -1);
            }

            function nullProto(object) {
                Reflect.setPrototypeOf(object, null);
                return object;
            }

            expect(getToStringTag(nullProto([]))).toBe('Array');
            expect(getToStringTag(nullProto(new Array()))).toBe('Array');
            expect(getToStringTag(nullProto(new Boolean(true)))).toBe('Boolean');
            expect(getToStringTag(nullProto(function (){}))).toBe('Function');
            expect(getToStringTag(nullProto(async ()=>{}))).toBe('Function');
            expect(getToStringTag(nullProto(function * (){}))).toBe('Function');
            expect(getToStringTag(nullProto(async function * (){}))).toBe('Function');
            expect(getToStringTag(nullProto(new Date()))).toBe('Date');
            expect(getToStringTag(nullProto({}))).toEqual('Object');
            expect(getToStringTag(nullProto(new Number(0)))).toBe('Number');
            expect(getToStringTag(nullProto(/a/))).toBe('RegExp');
            expect(getToStringTag(nullProto(new RegExp('a')))).toBe('RegExp');
            expect(getToStringTag(nullProto(new String('a')))).toBe('String');
            expect(getToStringTag(nullProto(Object(Symbol('a'))))).toBe('Object');

            const buffer = new ArrayBuffer(8);
            expect(getToStringTag(nullProto(buffer))).toBe('ArrayBuffer');
            expect(getToStringTag(nullProto(new DataView(buffer)))).toBe('Object');
            expect(getToStringTag(nullProto(new Float32Array(buffer)))).toBe('Object');
            expect(getToStringTag(nullProto(new Float64Array(buffer)))).toBe('Object');
            expect(getToStringTag(nullProto(new Int8Array(buffer)))).toBe('Object');
            expect(getToStringTag(nullProto(new Int16Array(buffer)))).toBe('Object');
            expect(getToStringTag(nullProto(new Int32Array(buffer)))).toBe('Object');
            expect(getToStringTag(nullProto(new Uint8Array(buffer)))).toBe('Object');
            expect(getToStringTag(nullProto(new Uint8ClampedArray(buffer)))).toBe('Object');
            expect(getToStringTag(nullProto(new Uint16Array(buffer)))).toBe('Object');
            expect(getToStringTag(nullProto(new Uint32Array(buffer)))).toBe('Object');

            const custom = nullProto({ [Symbol.toStringTag]: 'Custom' });
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
