import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('object-branding', () => {
    it('should get branding of target', () => {
        expect.assertions(28);

        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
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
        expect.assertions(39);

        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            function getToStringTag(object) {
                return Object.prototype.toString.call(object).slice(8, -1);
            }

            function setProto(object, proto) {
                Reflect.setPrototypeOf(object, proto);
                return object;
            }

            expect(getToStringTag(setProto([], null))).toBe('Array');
            expect(getToStringTag(setProto(new Array(), null))).toBe('Array');
            expect(getToStringTag(setProto(new Boolean(true), null))).toBe('Boolean');
            expect(getToStringTag(setProto(function (){}, null))).toBe('Function');
            expect(getToStringTag(setProto(async ()=>{}, null))).toBe('Function');
            expect(getToStringTag(setProto(function * (){}, null))).toBe('Function');
            expect(getToStringTag(setProto(async function * (){}, null))).toBe('Function');
            expect(getToStringTag(setProto(new Date(), null))).toBe('Date');
            expect(getToStringTag(setProto({}, null))).toEqual('Object');
            expect(getToStringTag(setProto(new Number(0), null))).toBe('Number');
            expect(getToStringTag(setProto(/a/, null))).toBe('RegExp');
            expect(getToStringTag(setProto(new RegExp('a'), null))).toBe('RegExp');
            expect(getToStringTag(setProto(new String('a'), null))).toBe('String');
            expect(getToStringTag(setProto(Object(Symbol('a')), null))).toBe('Object');

            const buffer = new ArrayBuffer(8);
            const bufferProto = Reflect.getPrototypeOf(buffer);
            expect(getToStringTag(setProto(buffer, null))).toBe('Object');
            expect(getToStringTag(setProto(buffer, bufferProto))).toBe('ArrayBuffer');

            const dataView = new DataView(buffer);
            const dataViewProto = Reflect.getPrototypeOf(dataView);
            expect(getToStringTag(setProto(dataView, null))).toBe('Object');
            expect(getToStringTag(setProto(dataView, dataViewProto))).toBe('DataView');

            const float32Array = new Float32Array(buffer);
            const float32ArrayProto = Reflect.getPrototypeOf(float32Array);
            expect(getToStringTag(setProto(float32Array, null))).toBe('Object');
            expect(getToStringTag(setProto(float32Array, float32ArrayProto))).toBe(
                'Float32Array'
            );

            const float64Array = new Float64Array(buffer);
            const float64ArrayProto = Reflect.getPrototypeOf(float64Array);
            expect(getToStringTag(setProto(float64Array, null))).toBe('Object');
            expect(getToStringTag(setProto(float64Array, float64ArrayProto))).toBe(
                'Float64Array'
            );

            const int8Array = new Int8Array(buffer);
            const int8ArrayProto = Reflect.getPrototypeOf(int8Array);
            expect(getToStringTag(setProto(int8Array, null))).toBe('Object');
            expect(getToStringTag(setProto(int8Array, int8ArrayProto))).toBe(
                'Int8Array'
            );

            const int16Array = new Int16Array(buffer);
            const int16ArrayProto = Reflect.getPrototypeOf(int16Array);
            expect(getToStringTag(setProto(int16Array, null))).toBe('Object');
            expect(getToStringTag(setProto(int16Array, int8ArrayProto))).toBe(
                'Int16Array'
            );

            const int32Array = new Int32Array(buffer);
            const int32ArrayProto = Reflect.getPrototypeOf(int32Array);
            expect(getToStringTag(setProto(int32Array, null))).toBe('Object');
            expect(getToStringTag(setProto(int32Array, int8ArrayProto))).toBe(
                'Int32Array'
            );

            const uint8Array = new Uint8Array(buffer);
            const uint8ArrayProto = Reflect.getPrototypeOf(uint8Array);
            expect(getToStringTag(setProto(uint8Array, null))).toBe('Object');
            expect(getToStringTag(setProto(uint8Array, uint8ArrayProto))).toBe(
                'Uint8Array'
            );

            const uint8ClampedArray = new Uint8ClampedArray(buffer);
            const uint8ClampedArrayProto = Reflect.getPrototypeOf(uint8ClampedArray);
            expect(getToStringTag(setProto(uint8ClampedArray, null))).toBe('Object');
            expect(getToStringTag(setProto(uint8ClampedArray, uint8ClampedArrayProto))).toBe(
                'Uint8ClampedArray'
            );

            const uint16Array = new Uint16Array(buffer);
            const uint16ArrayProto = Reflect.getPrototypeOf(uint16Array);
            expect(getToStringTag(setProto(uint16Array, null))).toBe('Object');
            expect(getToStringTag(setProto(uint16Array, uint16ArrayProto))).toBe(
                'Uint16Array'
            );

            const uint32Array = new Uint32Array(buffer);
            const uint32ArrayProto = Reflect.getPrototypeOf(uint32Array);
            expect(getToStringTag(setProto(uint32Array, null))).toBe('Object');
            expect(getToStringTag(setProto(uint32Array, uint32ArrayProto))).toBe(
                'Uint32Array'
            );

            const custom = setProto({ [Symbol.toStringTag]: 'Custom' }, null);
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
