import {
    ReflectApply,
    ReflectConstruct,
    ReflectDefineProperty,
    ReflectDeleteProperty,
    ReflectGet,
    ReflectGetOwnPropertyDescriptor,
    ReflectGetPrototypeOf,
    ReflectHas,
    ReflectIsExtensible,
    ReflectOwnKeys,
    ReflectPreventExtensions,
    ReflectSet,
    ReflectSetPrototypeOf,
} from '../../dist/index.mjs.js';

describe('Reflect', () => {
    it('ReflectApply', () => {
        expect(ReflectApply).toBe(Reflect.apply);
    });
    it('ReflectConstruct', () => {
        expect(ReflectConstruct).toBe(Reflect.construct);
    });
    it('ReflectDefineProperty', () => {
        expect(ReflectDefineProperty).toBe(Reflect.defineProperty);
    });
    it('ReflectDeleteProperty', () => {
        expect(ReflectDeleteProperty).toBe(Reflect.deleteProperty);
    });
    it('ReflectGet', () => {
        expect(ReflectGet).toBe(Reflect.get);
    });
    it('ReflectGetOwnPropertyDescriptor', () => {
        expect(ReflectGetOwnPropertyDescriptor).toBe(Reflect.getOwnPropertyDescriptor);
    });
    it('ReflectGetPrototypeOf', () => {
        expect(ReflectGetPrototypeOf).toBe(Reflect.getPrototypeOf);
    });
    it('ReflectHas', () => {
        expect(ReflectHas).toBe(Reflect.has);
    });
    it('ReflectIsExtensible', () => {
        expect(ReflectIsExtensible).toBe(Reflect.isExtensible);
    });
    it('ReflectOwnKeys', () => {
        expect(ReflectOwnKeys).toBe(Reflect.ownKeys);
    });
    it('ReflectPreventExtensions', () => {
        expect(ReflectPreventExtensions).toBe(Reflect.preventExtensions);
    });
    it('ReflectSet', () => {
        expect(ReflectSet).toBe(Reflect.set);
    });
    it('ReflectSetPrototypeOf', () => {
        expect(ReflectSetPrototypeOf).toBe(Reflect.setPrototypeOf);
    });
});
