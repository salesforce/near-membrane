import {
    ReflectApply,
    ReflectDefineProperty,
    ReflectDeleteProperty,
    ReflectGetPrototypeOf,
    ReflectOwnKeys,
    ReflectSetPrototypeOf,
} from '../../dist/index';

describe('Reflect', () => {
    it('ReflectApply', () => {
        expect(ReflectApply).toBe(Reflect.apply);
    });
    it('ReflectDefineProperty', () => {
        expect(ReflectDefineProperty).toBe(Reflect.defineProperty);
    });
    it('ReflectDeleteProperty', () => {
        expect(ReflectDeleteProperty).toBe(Reflect.deleteProperty);
    });
    it('ReflectGetPrototypeOf', () => {
        expect(ReflectGetPrototypeOf).toBe(Reflect.getPrototypeOf);
    });
    it('ReflectOwnKeys', () => {
        expect(ReflectOwnKeys).toBe(Reflect.ownKeys);
    });
    it('ReflectSetPrototypeOf', () => {
        expect(ReflectSetPrototypeOf).toBe(Reflect.setPrototypeOf);
    });
});
