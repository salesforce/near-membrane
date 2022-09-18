import {
    ObjectAssign,
    ObjectFreeze,
    ObjectLookupOwnGetter,
    ObjectLookupOwnSetter,
} from '../../dist/index';

describe('Object', () => {
    it('ObjectAssign', () => {
        expect(ObjectAssign).toBe(Object.assign);
    });
    it('ObjectFreeze', () => {
        expect(ObjectFreeze).toBe(Object.freeze);
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
});
