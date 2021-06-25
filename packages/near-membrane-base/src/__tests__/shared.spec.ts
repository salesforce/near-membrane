import { ObjectLookupOwnGetter, WeakMapHas } from '../shared';

describe('ObjectLookupOwnGetter', () => {
    it('should return undefined when object argument is null', () => {
        expect.assertions(1);
        expect(ObjectLookupOwnGetter(null)).toBe(undefined);
    });
    it('should return undefined when object argument is undefined', () => {
        expect.assertions(1);
        expect(ObjectLookupOwnGetter(undefined)).toBe(undefined);
    });
    it('should return undefined when object argument has no such property', () => {
        expect.assertions(1);
        expect(ObjectLookupOwnGetter({}, 'foo')).toBe(undefined);
    });
    it('should return getter when object argument has property and getter', () => {
        expect.assertions(1);
        const o = {
            get x() {
                return 1;
            },
        };
        expect(ObjectLookupOwnGetter(o, 'x')).toBe(Object.getOwnPropertyDescriptor(o, 'x').get);
    });
    it('should not lookup inherited getters', () => {
        expect.assertions(2);

        class C {
            get foo() {
                return this;
            }
        }

        const c = new C();

        const o = Object.create({
            get foo() {
                return this;
            },
        });

        expect(ObjectLookupOwnGetter(c, 'foo')).toBe(undefined);
        expect(ObjectLookupOwnGetter(o, 'foo')).toBe(undefined);
    });
});
