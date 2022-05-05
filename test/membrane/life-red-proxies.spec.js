import createVirtualEnvironment from '@locker/near-membrane-dom';

const LOCKER_LIVE_VALUE_MARKER_SYMBOL = Symbol.for('@@lockerLiveValue');

class ExoticObject {
    constructor(source) {
        if (source) {
            Object.defineProperties(this, Object.getOwnPropertyDescriptors(source));
        }
    }
}

const array = [];
const buffer = new ArrayBuffer(8);
const bigInt64Array = new BigInt64Array(buffer);
const bigUint64Array = new BigUint64Array(buffer);
const dataView = new DataView(buffer);
const float32Array = new Float32Array(buffer);
const float64Array = new Float64Array(buffer);
const int8Array = new Int8Array(buffer);
const int16Array = new Int16Array(buffer);
const int32Array = new Int32Array(buffer);
const uint8Array = new Uint8Array(buffer);
const regexp = /a/;
const uint8ClampedArray = new Uint8ClampedArray(buffer);
const uint16Array = new Uint16Array(buffer);
const uint32Array = new Uint32Array(buffer);

const plainObject = {
    x: 'uno',
};

const plainObjectNullProto = {
    __proto__: null,
    x: 'uno',
};

const exoticLiveObject = new ExoticObject(plainObject);
Reflect.defineProperty(exoticLiveObject, LOCKER_LIVE_VALUE_MARKER_SYMBOL, {});

const env = createVirtualEnvironment(window, {
    endowments: Object.getOwnPropertyDescriptors({
        array,
        bigInt64Array,
        bigUint64Array,
        buffer,
        dataView,
        exoticLiveObject,
        expect,
        float32Array,
        float64Array,
        int8Array,
        int16Array,
        int32Array,
        jasmine,
        plainObject,
        plainObjectNullProto,
        regexp,
        uint8Array,
        uint8ClampedArray,
        uint16Array,
        uint32Array,
    }),
});

describe('a live red proxy', () => {
    it('should surface new expandos from blue realm', () => {
        expect.assertions(18);

        exoticLiveObject.x = 'uno';
        exoticLiveObject.y = 'dos';

        plainObject.x = 'uno';
        plainObject.y = 'dos';

        plainObjectNullProto.x = 'uno';
        plainObjectNullProto.y = 'dos';

        array.x = 'uno';
        array.y = 'dos';

        bigInt64Array.x = 'uno';
        bigInt64Array.y = 'dos';

        bigUint64Array.x = 'uno';
        bigUint64Array.y = 'dos';

        buffer.x = 'uno';
        buffer.y = 'dos';

        dataView.x = 'uno';
        dataView.y = 'dos';

        float32Array.x = 'uno';
        float32Array.y = 'dos';

        float64Array.x = 'uno';
        float64Array.y = 'dos';

        int8Array.x = 'uno';
        int8Array.y = 'dos';

        int16Array.x = 'uno';
        int16Array.y = 'dos';

        int32Array.x = 'uno';
        int32Array.y = 'dos';

        regexp.x = 'uno';
        regexp.y = 'dos';

        uint8Array.x = 'uno';
        uint8Array.y = 'dos';

        uint8ClampedArray.x = 'uno';
        uint8ClampedArray.y = 'dos';

        uint16Array.x = 'uno';
        uint16Array.y = 'dos';

        uint32Array.x = 'uno';
        uint32Array.y = 'dos';

        env.evaluate(`
            const equalMatcher = jasmine.objectContaining({
                x: 'uno',
                y: 'dos',
            });

            expect(exoticLiveObject).toEqual(equalMatcher);
            expect(plainObject).toEqual(equalMatcher);
            expect(plainObjectNullProto).toEqual(equalMatcher);
            expect(array).toEqual(equalMatcher);
            expect(bigInt64Array).toEqual(equalMatcher);
            expect(bigUint64Array).toEqual(equalMatcher);
            expect(buffer).toEqual(equalMatcher);
            expect(dataView).toEqual(equalMatcher);
            expect(float32Array).toEqual(equalMatcher);
            expect(float64Array).toEqual(equalMatcher);
            expect(int8Array).toEqual(equalMatcher);
            expect(int16Array).toEqual(equalMatcher);
            expect(int32Array).toEqual(equalMatcher);
            expect(regexp).toEqual(equalMatcher);
            expect(uint8Array).toEqual(equalMatcher);
            expect(uint8ClampedArray).toEqual(equalMatcher);
            expect(uint16Array).toEqual(equalMatcher);
            expect(uint32Array).toEqual(equalMatcher);
        `);
    });
    it('should allow mutation from blue realm', () => {
        expect.assertions(36);

        exoticLiveObject.x = 'tres';
        exoticLiveObject.y = 'cuatro';

        plainObject.x = 'tres';
        plainObject.y = 'cuatro';

        plainObjectNullProto.x = 'tres';
        plainObjectNullProto.y = 'cuatro';

        array.x = 'tres';
        array.y = 'cuatro';

        bigInt64Array.x = 'tres';
        bigInt64Array.y = 'cuatro';

        bigUint64Array.x = 'tres';
        bigUint64Array.y = 'cuatro';

        buffer.x = 'tres';
        buffer.y = 'cuatro';

        dataView.x = 'tres';
        dataView.y = 'cuatro';

        float32Array.x = 'tres';
        float32Array.y = 'cuatro';

        float64Array.x = 'tres';
        float64Array.y = 'cuatro';

        int8Array.x = 'tres';
        int8Array.y = 'cuatro';

        int16Array.x = 'tres';
        int16Array.y = 'cuatro';

        int32Array.x = 'tres';
        int32Array.y = 'cuatro';

        regexp.x = 'tres';
        regexp.y = 'cuatro';

        uint8Array.x = 'tres';
        uint8Array.y = 'cuatro';

        uint8ClampedArray.x = 'tres';
        uint8ClampedArray.y = 'cuatro';

        uint16Array.x = 'tres';
        uint16Array.y = 'cuatro';

        uint32Array.x = 'tres';
        uint32Array.y = 'cuatro';

        env.evaluate(`
            const equalMatcher = jasmine.objectContaining({
                x: 'tres',
                y: 'cuatro',
            });

            expect(exoticLiveObject).toEqual(equalMatcher);
            expect(plainObject).toEqual(equalMatcher);
            expect(plainObjectNullProto).toEqual(equalMatcher);
            expect(array).toEqual(equalMatcher);
            expect(bigInt64Array).toEqual(equalMatcher);
            expect(bigUint64Array).toEqual(equalMatcher);
            expect(buffer).toEqual(equalMatcher);
            expect(dataView).toEqual(equalMatcher);
            expect(float32Array).toEqual(equalMatcher);
            expect(float64Array).toEqual(equalMatcher);
            expect(int8Array).toEqual(equalMatcher);
            expect(int16Array).toEqual(equalMatcher);
            expect(int32Array).toEqual(equalMatcher);
            expect(regexp).toEqual(equalMatcher);
            expect(uint8Array).toEqual(equalMatcher);
            expect(uint8ClampedArray).toEqual(equalMatcher);
            expect(uint16Array).toEqual(equalMatcher);
            expect(uint32Array).toEqual(equalMatcher);
        `);

        const equalMatcher = jasmine.objectContaining({
            x: 'tres',
            y: 'cuatro',
        });

        expect(exoticLiveObject).toEqual(equalMatcher);
        expect(plainObject).toEqual(equalMatcher);
        expect(plainObjectNullProto).toEqual(equalMatcher);
        expect(array).toEqual(equalMatcher);
        expect(bigInt64Array).toEqual(equalMatcher);
        expect(bigUint64Array).toEqual(equalMatcher);
        expect(buffer).toEqual(equalMatcher);
        expect(dataView).toEqual(equalMatcher);
        expect(float32Array).toEqual(equalMatcher);
        expect(float64Array).toEqual(equalMatcher);
        expect(int8Array).toEqual(equalMatcher);
        expect(int16Array).toEqual(equalMatcher);
        expect(int32Array).toEqual(equalMatcher);
        expect(regexp).toEqual(equalMatcher);
        expect(uint8Array).toEqual(equalMatcher);
        expect(uint8ClampedArray).toEqual(equalMatcher);
        expect(uint16Array).toEqual(equalMatcher);
        expect(uint32Array).toEqual(equalMatcher);
    });
    it('should allow mutation from within the sandbox', () => {
        expect.assertions(36);

        env.evaluate(`
            const equalMatcher = jasmine.objectContaining({
                x: 'cinco',
                y: 'six',
            });

            exoticLiveObject.x = 'cinco';
            exoticLiveObject.y = 'six';

            plainObject.x = 'cinco';
            plainObject.y = 'six';

            plainObjectNullProto.x = 'cinco';
            plainObjectNullProto.y = 'six';

            array.x = 'cinco';
            array.y = 'six';

            bigInt64Array.x = 'cinco';
            bigInt64Array.y = 'six';

            bigUint64Array.x = 'cinco';
            bigUint64Array.y = 'six';

            buffer.x = 'cinco';
            buffer.y = 'six';

            dataView.x = 'cinco';
            dataView.y = 'six';

            float32Array.x = 'cinco';
            float32Array.y = 'six';

            float64Array.x = 'cinco';
            float64Array.y = 'six';

            int8Array.x = 'cinco';
            int8Array.y = 'six';

            int16Array.x = 'cinco';
            int16Array.y = 'six';

            int32Array.x = 'cinco';
            int32Array.y = 'six';

            regexp.x = 'cinco';
            regexp.y = 'six';

            uint8Array.x = 'cinco';
            uint8Array.y = 'six';

            uint8ClampedArray.x = 'cinco';
            uint8ClampedArray.y = 'six';

            uint16Array.x = 'cinco';
            uint16Array.y = 'six';

            uint32Array.x = 'cinco';
            uint32Array.y = 'six';

            expect(exoticLiveObject).toEqual(equalMatcher);
            expect(plainObject).toEqual(equalMatcher);
            expect(plainObjectNullProto).toEqual(equalMatcher);
            expect(array).toEqual(equalMatcher);
            expect(bigInt64Array).toEqual(equalMatcher);
            expect(bigUint64Array).toEqual(equalMatcher);
            expect(buffer).toEqual(equalMatcher);
            expect(dataView).toEqual(equalMatcher);
            expect(float32Array).toEqual(equalMatcher);
            expect(float64Array).toEqual(equalMatcher);
            expect(int8Array).toEqual(equalMatcher);
            expect(int16Array).toEqual(equalMatcher);
            expect(int32Array).toEqual(equalMatcher);
            expect(regexp).toEqual(equalMatcher);
            expect(uint8Array).toEqual(equalMatcher);
            expect(uint8ClampedArray).toEqual(equalMatcher);
            expect(uint16Array).toEqual(equalMatcher);
            expect(uint32Array).toEqual(equalMatcher);
        `);

        const equalMatcher = jasmine.objectContaining({
            x: 'cinco',
            y: 'six',
        });

        expect(exoticLiveObject).toEqual(equalMatcher);
        expect(plainObject).toEqual(equalMatcher);
        expect(plainObjectNullProto).toEqual(equalMatcher);
        expect(array).toEqual(equalMatcher);
        expect(bigInt64Array).toEqual(equalMatcher);
        expect(bigUint64Array).toEqual(equalMatcher);
        expect(buffer).toEqual(equalMatcher);
        expect(dataView).toEqual(equalMatcher);
        expect(float32Array).toEqual(equalMatcher);
        expect(float64Array).toEqual(equalMatcher);
        expect(int8Array).toEqual(equalMatcher);
        expect(int16Array).toEqual(equalMatcher);
        expect(int32Array).toEqual(equalMatcher);
        expect(regexp).toEqual(equalMatcher);
        expect(uint8Array).toEqual(equalMatcher);
        expect(uint8ClampedArray).toEqual(equalMatcher);
        expect(uint16Array).toEqual(equalMatcher);
        expect(uint32Array).toEqual(equalMatcher);
    });
    it('should allow expandos added form within the sandbox', () => {
        expect.assertions(36);

        env.evaluate(`
            exoticLiveObject.z = 'seven';
            plainObject.z = 'seven';
            plainObjectNullProto.z = 'seven';
            array.z = 'seven';
            bigInt64Array.z = 'seven';
            bigUint64Array.z = 'seven';
            buffer.z = 'seven';
            dataView.z = 'seven';
            float32Array.z = 'seven';
            float64Array.z = 'seven';
            int8Array.z = 'seven';
            int16Array.z = 'seven';
            int32Array.z = 'seven';
            regexp.z = 'seven';
            uint8Array.z = 'seven';
            uint8ClampedArray.z = 'seven';
            uint16Array.z = 'seven';
            uint32Array.z = 'seven';

            expect(exoticLiveObject.z).toBe('seven');
            expect(plainObject.z).toBe('seven');
            expect(plainObjectNullProto.z).toBe('seven');
            expect(array.z).toBe('seven');
            expect(bigInt64Array.z).toBe('seven');
            expect(bigUint64Array.z).toBe('seven');
            expect(buffer.z).toBe('seven');
            expect(dataView.z).toBe('seven');
            expect(float32Array.z).toBe('seven');
            expect(float64Array.z).toBe('seven');
            expect(int8Array.z).toBe('seven');
            expect(int16Array.z).toBe('seven');
            expect(int32Array.z).toBe('seven');
            expect(regexp.z).toBe('seven');
            expect(uint8Array.z).toBe('seven');
            expect(uint8ClampedArray.z).toBe('seven');
            expect(uint16Array.z).toBe('seven');
            expect(uint32Array.z).toBe('seven');
        `);

        expect(exoticLiveObject.z).toBe('seven');
        expect(plainObject.z).toBe('seven');
        expect(plainObjectNullProto.z).toBe('seven');
        expect(array.z).toBe('seven');
        expect(bigInt64Array.z).toBe('seven');
        expect(bigUint64Array.z).toBe('seven');
        expect(buffer.z).toBe('seven');
        expect(dataView.z).toBe('seven');
        expect(float32Array.z).toBe('seven');
        expect(float64Array.z).toBe('seven');
        expect(int8Array.z).toBe('seven');
        expect(int16Array.z).toBe('seven');
        expect(int32Array.z).toBe('seven');
        expect(regexp.z).toBe('seven');
        expect(uint8Array.z).toBe('seven');
        expect(uint8ClampedArray.z).toBe('seven');
        expect(uint16Array.z).toBe('seven');
        expect(uint32Array.z).toBe('seven');
    });
    it('should affect own properties of stamped live objects', () => {
        expect.assertions(4);

        exoticLiveObject.w = new ExoticObject({ x: 1 });

        env.evaluate(`
            exoticLiveObject.z = 'siete';
            expect(exoticLiveObject.z).toBe('siete');
            expect({ ...exoticLiveObject.w }).toEqual({ x: 1 });
            exoticLiveObject.w.x = 2;
            expect({ ...exoticLiveObject.w }).toEqual({ x: 2 });
        `);

        const equalMatcher = jasmine.objectContaining({
            w: new ExoticObject({ x: 1 }),
            z: 'siete',
        });

        expect(exoticLiveObject).toEqual(equalMatcher);
    });
    it('should affect all unstamped live object properties', () => {
        expect.assertions(68);

        plainObject.w = { x: 1 };
        plainObjectNullProto.w = { x: 1 };
        array.w = { x: 1 };
        bigInt64Array.w = { x: 1 };
        bigUint64Array.w = { x: 1 };
        buffer.w = { x: 1 };
        dataView.w = { x: 1 };
        float32Array.w = { x: 1 };
        float64Array.w = { x: 1 };
        int8Array.w = { x: 1 };
        int16Array.w = { x: 1 };
        int32Array.w = { x: 1 };
        regexp.w = { x: 1 };
        uint8Array.w = { x: 1 };
        uint8ClampedArray.w = { x: 1 };
        uint16Array.w = { x: 1 };
        uint32Array.w = { x: 1 };

        env.evaluate(`
            plainObject.z = 'siete';
            expect(plainObject.z).toBe('siete');
            expect(plainObject.w).toEqual({ x: 1 });
            plainObject.w.x = 2;
            expect(plainObject.w).toEqual({ x: 2 });

            plainObjectNullProto.z = 'siete';
            expect(plainObjectNullProto.z).toBe('siete');
            expect(plainObjectNullProto.w).toEqual({ x: 1 });
            plainObjectNullProto.w.x = 2;
            expect(plainObjectNullProto.w).toEqual({ x: 2 });

            array.z = 'siete';
            expect(array.z).toBe('siete');
            expect(array.w).toEqual({ x: 1 });
            array.w.x = 2;
            expect(array.w).toEqual({ x: 2 });

            bigInt64Array.z = 'siete';
            expect(bigInt64Array.z).toBe('siete');
            expect(bigInt64Array.w).toEqual({ x: 1 });
            bigInt64Array.w.x = 2;
            expect(bigInt64Array.w).toEqual({ x: 2 });

            bigUint64Array.z = 'siete';
            expect(bigUint64Array.z).toBe('siete');
            expect(bigUint64Array.w).toEqual({ x: 1 });
            bigUint64Array.w.x = 2;
            expect(bigUint64Array.w).toEqual({ x: 2 });

            buffer.z = 'siete';
            expect(buffer.z).toBe('siete');
            expect(buffer.w).toEqual({ x: 1 });
            buffer.w.x = 2;
            expect(buffer.w).toEqual({ x: 2 });

            dataView.z = 'siete';
            expect(dataView.z).toBe('siete');
            expect(dataView.w).toEqual({ x: 1 });
            dataView.w.x = 2;
            expect(dataView.w).toEqual({ x: 2 });

            float32Array.z = 'siete';
            expect(float32Array.z).toBe('siete');
            expect(float32Array.w).toEqual({ x: 1 });
            float32Array.w.x = 2;
            expect(float32Array.w).toEqual({ x: 2 });

            float64Array.z = 'siete';
            expect(float64Array.z).toBe('siete');
            expect(float64Array.w).toEqual({ x: 1 });
            float64Array.w.x = 2;
            expect(float64Array.w).toEqual({ x: 2 });

            int8Array.z = 'siete';
            expect(int8Array.z).toBe('siete');
            expect(int8Array.w).toEqual({ x: 1 });
            int8Array.w.x = 2;
            expect(int8Array.w).toEqual({ x: 2 });

            int16Array.z = 'siete';
            expect(int16Array.z).toBe('siete');
            expect(int16Array.w).toEqual({ x: 1 });
            int16Array.w.x = 2;
            expect(int16Array.w).toEqual({ x: 2 });

            int32Array.z = 'siete';
            expect(int32Array.z).toBe('siete');
            expect(int32Array.w).toEqual({ x: 1 });
            int32Array.w.x = 2;
            expect(int32Array.w).toEqual({ x: 2 });

            regexp.z = 'siete';
            expect(regexp.z).toBe('siete');
            expect(regexp.w).toEqual({ x: 1 });
            regexp.w.x = 2;
            expect(regexp.w).toEqual({ x: 2 });

            uint8Array.z = 'siete';
            expect(uint8Array.z).toBe('siete');
            expect(uint8Array.w).toEqual({ x: 1 });
            uint8Array.w.x = 2;
            expect(uint8Array.w).toEqual({ x: 2 });

            uint8ClampedArray.z = 'siete';
            expect(uint8ClampedArray.z).toBe('siete');
            expect(uint8ClampedArray.w).toEqual({ x: 1 });
            uint8ClampedArray.w.x = 2;
            expect(uint8ClampedArray.w).toEqual({ x: 2 });

            uint16Array.z = 'siete';
            expect(uint16Array.z).toBe('siete');
            expect(uint16Array.w).toEqual({ x: 1 });
            uint16Array.w.x = 2;
            expect(uint16Array.w).toEqual({ x: 2 });

            uint32Array.z = 'siete';
            expect(uint32Array.z).toBe('siete');
            expect(uint32Array.w).toEqual({ x: 1 });
            uint32Array.w.x = 2;
            expect(uint32Array.w).toEqual({ x: 2 });
        `);

        const equalMatcher = jasmine.objectContaining({
            w: { x: 2 },
            z: 'siete',
        });

        expect(plainObject).toEqual(equalMatcher);
        expect(plainObjectNullProto).toEqual(equalMatcher);
        expect(array).toEqual(equalMatcher);
        expect(bigInt64Array).toEqual(equalMatcher);
        expect(bigUint64Array).toEqual(equalMatcher);
        expect(buffer).toEqual(equalMatcher);
        expect(dataView).toEqual(equalMatcher);
        expect(float32Array).toEqual(equalMatcher);
        expect(float64Array).toEqual(equalMatcher);
        expect(int8Array).toEqual(equalMatcher);
        expect(int16Array).toEqual(equalMatcher);
        expect(int32Array).toEqual(equalMatcher);
        expect(regexp).toEqual(equalMatcher);
        expect(uint8Array).toEqual(equalMatcher);
        expect(uint8ClampedArray).toEqual(equalMatcher);
        expect(uint16Array).toEqual(equalMatcher);
        expect(uint32Array).toEqual(equalMatcher);
    });
});
