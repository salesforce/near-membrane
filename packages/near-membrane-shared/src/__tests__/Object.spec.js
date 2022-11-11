import {
    isObject,
    ObjectAssign,
    ObjectFreeze,
    ObjectHasOwn,
    ObjectKeys,
    ObjectLookupOwnGetter,
    ObjectLookupOwnSetter,
    ObjectProtoToString,
} from '../../dist/index.mjs.js';

describe('Object', () => {
    it('isObject', () => {
        expect(isObject(true)).toBe(false);
        expect(isObject('')).toBe(false);
        expect(isObject(42)).toBe(false);
        expect(isObject(null)).toBe(false);
        expect(isObject(undefined)).toBe(false);
        expect(isObject(() => {})).toBe(false);
        expect(isObject(class {})).toBe(false);
        expect(isObject({ x: 1 })).toBe(true);
        expect(isObject([])).toBe(true);
        expect(isObject({})).toBe(true);
        expect(isObject(Object.create(null))).toBe(true);
    });
    it('ObjectAssign', () => {
        expect(ObjectAssign).toBe(Object.assign);
    });
    it('ObjectFreeze', () => {
        expect(ObjectFreeze).toBe(Object.freeze);
    });
    it('ObjectHasOwn', () => {
        expect(() => ObjectHasOwn(null, 'x')).toThrowError();
        expect(() => ObjectHasOwn(undefined, 'x')).toThrowError();
        expect(ObjectHasOwn({}, 'x')).toBe(false);
        expect(ObjectHasOwn({ __proto__: { x: undefined } }, 'x')).toBe(false);
        expect(ObjectHasOwn({ x: undefined }, 'x')).toBe(true);
    });
    it('ObjectKeys', () => {
        expect(ObjectKeys).toBe(Object.keys);
    });
    it('ObjectLookupOwnGetter', () => {
        expect(ObjectLookupOwnGetter(undefined, undefined)).toBe(undefined);
        expect(ObjectLookupOwnGetter(null, null)).toBe(undefined);
        expect(ObjectLookupOwnGetter(null, 'x')).toBe(undefined);
        expect(ObjectLookupOwnGetter(undefined, 'x')).toBe(undefined);
        expect(ObjectLookupOwnGetter({}, 'x')).toBe(undefined);
        expect(
            ObjectLookupOwnGetter(
                {
                    get x() {
                        return 1;
                    },
                },
                'x'
            )()
        ).toBe(1);
        const o = {};
        Reflect.defineProperty(o, 'x', {
            get() {
                return 1;
            },
        });
        expect(ObjectLookupOwnGetter(o, 'x')()).toBe(1);
        // eslint-disable-next-line no-restricted-properties, no-underscore-dangle
        o.__defineGetter__('y', () => 1);
        expect(ObjectLookupOwnGetter(o, 'y')()).toBe(1);
        expect(ObjectLookupOwnGetter(Object.create(o), 'x')).toBe(undefined);
    });
    it('ObjectLookupOwnSetter', () => {
        expect(ObjectLookupOwnSetter(null, 'x')).toBe(undefined);
        expect(ObjectLookupOwnSetter(undefined, 'x')).toBe(undefined);
        expect(ObjectLookupOwnSetter({}, 'x')).toBe(undefined);
        // eslint-disable-next-line no-empty-function
        const o = { set x(_v) {} };
        const { set: xSetter } = Reflect.getOwnPropertyDescriptor(o, 'x');
        expect(ObjectLookupOwnSetter(o, 'x')).toBe(xSetter);
        delete o.x;
        // eslint-disable-next-line no-restricted-properties, no-underscore-dangle
        o.__defineSetter__('x', xSetter);
        delete o.x;
        Reflect.defineProperty(o, 'x', { set: xSetter });
        expect(ObjectLookupOwnSetter(o, 'x')).toBe(xSetter);
        expect(ObjectLookupOwnSetter(o, 'x')).toBe(xSetter);
        expect(ObjectLookupOwnSetter(Object.create(o), 'x')).toBe(undefined);
    });
    it('ObjectProtoToString', () => {
        expect(ObjectProtoToString).toBe(Object.prototype.toString);
    });
});
