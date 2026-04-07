import {
    createUnmaskableTraps,
    ERR_ILLEGAL_PROPERTY_ACCESS,
    FunctionProtoBind,
    identity,
    isMaskedFunction,
    LOCKER_NEAR_MEMBRANE_IS_MASKED_SYMBOL,
    LOCKER_NEAR_MEMBRANE_UNMASKED_VALUE_SYMBOL,
    maskFunction,
    noop,
} from '../../dist/index.mjs.js';

describe('Function', () => {
    it('createUnmaskableTraps', () => {
        const fn = () => {};
        const unmaskableTraps = createUnmaskableTraps(fn);

        expect(unmaskableTraps).toHaveProperty('defineProperty');
        expect(unmaskableTraps).toHaveProperty('get');
        expect(unmaskableTraps).toHaveProperty('getOwnPropertyDescriptor');
        expect(unmaskableTraps).toHaveProperty('has');
        expect(unmaskableTraps).toHaveProperty('set');

        const target = {};
        expect(() => {
            unmaskableTraps.defineProperty(target, 'foo', {
                configurable: true,
                value: 1,
                writable: true,
            });
        }).not.toThrow();
        expect(() => {
            unmaskableTraps.defineProperty(target, LOCKER_NEAR_MEMBRANE_UNMASKED_VALUE_SYMBOL, {});
        }).toThrow();

        expect(unmaskableTraps.get(target, 'foo')).toBe(1);
        expect(unmaskableTraps.get(target, 'foo', {})).toBe(1);
        expect(unmaskableTraps.get(target, 'foo', {}, false)).toBe(1);
        expect(unmaskableTraps.get(target, 'foo', {}, true)).toBe(1);

        expect(unmaskableTraps.getOwnPropertyDescriptor(target, 'foo')).toEqual({
            configurable: true,
            enumerable: false,
            value: 1,
            writable: true,
        });

        expect(unmaskableTraps.has(target, 'foo')).toBe(true);
        expect(unmaskableTraps.has(target, LOCKER_NEAR_MEMBRANE_UNMASKED_VALUE_SYMBOL)).toBe(false);

        unmaskableTraps.set(target, 'foo', 2, target);
        expect(target.foo).toBe(2);

        unmaskableTraps.set(target, 'foo', 3); // no receiver
        expect(target.foo).toBe(2);
    });

    it('FunctionProtoBind', () => {
        expect(FunctionProtoBind).toBe(Function.prototype.bind);
    });

    it('identity', () => {
        expect(identity()).toBe(undefined);
        expect(identity(null)).toBe(null);
        expect(identity(true)).toBe(true);
        expect(identity(1)).toBe(1);
        const o = {};
        expect(identity(o)).toBe(o);
    });

    it('isMaskedFunction', () => {
        expect(isMaskedFunction({})).toBe(false);
        expect(isMaskedFunction(null)).toBe(false);
        expect(isMaskedFunction(undefined)).toBe(false);
        const func = () => 'func';
        func[LOCKER_NEAR_MEMBRANE_IS_MASKED_SYMBOL] = true;
        expect(isMaskedFunction(func)).toBe(false);
        const mask = () => 'mask';
        expect(isMaskedFunction(mask)).toBe(false);
        const masked = maskFunction(func, mask);
        expect(isMaskedFunction(masked)).toBe(true);
    });

    it('noop', () => {
        expect(noop()).toBe(undefined);
        expect(noop(null)).toBe(undefined);
        expect(noop(true)).toBe(undefined);
        expect(noop(1)).toBe(undefined);
        expect(noop({})).toBe(undefined);
    });

    describe('maskFunction', () => {
        it('should mask function properties', () => {
            function mask() {
                return 'A';
            }
            mask.x = 1;
            mask[Symbol('y')] = 2;
            Reflect.defineProperty(mask, 'z', {
                configurable: true,
                enumerable: false,
                value: 3,
                writable: true,
            });
            const masked = maskFunction(() => 'a', mask);
            expect(masked.name).toBe(mask.name);
            expect(masked()).toBe('a');
            expect(Reflect.ownKeys(masked)).toEqual(Reflect.ownKeys(mask));
            expect(Reflect.getOwnPropertyDescriptor(masked, 'z')).toEqual(
                Reflect.getOwnPropertyDescriptor(mask, 'z')
            );
        });

        it('should mask extensibility', () => {
            function mask() {
                return 'A';
            }
            function frozenMask() {
                return 'frozen';
            }
            Object.freeze(frozenMask);
            function sealedMask() {
                return 'sealed';
            }
            Object.seal(sealedMask);

            const maskProto = Reflect.getPrototypeOf(mask);
            const masked = maskFunction(() => 'a', mask);
            const maskedFrozen = maskFunction(() => 'a', frozenMask);
            const maskedSealed = maskFunction(() => 'a', sealedMask);

            expect(Object.isFrozen(maskedFrozen)).toBe(true);
            expect(Object.isExtensible(maskedFrozen)).toBe(false);
            expect(Object.isFrozen(maskedSealed)).toBe(false);
            expect(Object.isExtensible(maskedSealed)).toBe(false);
            expect(Object.isSealed(maskedSealed)).toBe(true);

            masked.x = 1;
            expect(masked.x).toBe(1);
            expect(mask.x).toBe(1);
            expect(Reflect.deleteProperty(masked, 'x')).toBe(true);
            expect('x' in masked).toBe(false);
            expect('x' in mask).toBe(false);

            expect(Reflect.getPrototypeOf(masked)).toBe(maskProto);
            expect(Reflect.setPrototypeOf(masked, null)).toBe(true);
            expect(Reflect.getPrototypeOf(masked)).toBe(null);
            expect(Reflect.getPrototypeOf(mask)).toBe(null);
            Reflect.setPrototypeOf(mask, maskProto);

            expect(Reflect.preventExtensions(masked)).toBe(true);
            expect(Object.isExtensible(masked)).toBe(false);
            expect(Object.isExtensible(mask)).toBe(false);
        });

        it('should convert `this` of `mask` to `func`', () => {
            function mask() {
                return this;
            }
            function func() {
                return this;
            }
            const masked = maskFunction(func, mask);
            expect(Reflect.apply(masked, masked, [])).toBe(func);
            expect(Reflect.apply(masked, mask, [])).toBe(func);
        });

        it('should mask class properties', () => {
            class maskClass {}
            const masked = maskFunction(class funcClass {}, maskClass);
            expect(masked.name).toBe(maskClass.name);
            expect(masked.prototype).toBe(maskClass.prototype);
        });

        it('should convert `new.target` of `mask` to `func`', () => {
            expect.assertions(2);

            class maskClass {}
            const masked = maskFunction(
                class funcClass {
                    constructor() {
                        expect(new.target).toBe(funcClass);
                    }
                },
                maskClass
            );
            Reflect.construct(masked, [], masked);
            Reflect.construct(masked, [], maskClass);
        });

        it('should accept "apply" trap invokers', () => {
            expect.assertions(8);

            function mask() {
                return this;
            }
            function func() {
                return this;
            }
            const masked = maskFunction(func, mask, {
                apply(target, thisArg, args) {
                    expect(target).toBe(func);
                    expect(thisArg).toBe(func);
                    expect(args).toEqual(['a']);
                    return Reflect.apply(target, thisArg, args);
                },
            });
            expect(Reflect.apply(masked, masked, ['a'])).toBe(func);
            expect(Reflect.apply(masked, mask, ['a'])).toBe(func);
        });

        it('should accept "construct" trap invokers', () => {
            expect.assertions(8);

            class maskClass {}
            class theClass {
                constructor() {
                    expect(new.target).toBe(theClass);
                }
            }
            const masked = maskFunction(theClass, maskClass, {
                construct(target, args, newTarget) {
                    expect(target).toBe(theClass);
                    expect(args).toEqual(['a']);
                    expect(newTarget).toBe(theClass);
                    return Reflect.construct(target, args, newTarget);
                },
            });
            Reflect.construct(masked, ['a'], masked);
            Reflect.construct(masked, ['a'], maskClass);
        });

        it('should accept "get" trap invokers', () => {
            expect.assertions(4);

            function mask() {
                return 'A';
            }
            function func() {
                return 'a';
            }
            const masked = maskFunction(func, mask, {
                get(target, key, receiver, handshake) {
                    if (key === 'test') {
                        expect(target).toBe(mask);
                        expect(receiver).toBe(masked);
                        expect(handshake).toBe(false);
                        return 'testResult';
                    }
                    return Reflect.get(target, key, receiver);
                },
            });
            expect(masked.test).toBe('testResult');
        });

        it('should accept "has" trap invokers', () => {
            expect.assertions(2);

            function mask() {
                return 'A';
            }
            function func() {
                return 'a';
            }
            const masked = maskFunction(func, mask, {
                has(target, key) {
                    if (key === 'test') {
                        expect(target).toBe(mask);
                        return true;
                    }
                    return Reflect.has(target, key);
                },
            });
            expect('test' in masked).toBe(true);
        });

        it('should not allow `LOCKER_NEAR_MEMBRANE_IS_MASKED_SYMBOL` forgeries', () => {
            const bogusMask = () => 'bogusMask';
            const masked = maskFunction(() => 1, bogusMask);
            expect(() => {
                masked[LOCKER_NEAR_MEMBRANE_IS_MASKED_SYMBOL] = true;
            }).toThrow(ERR_ILLEGAL_PROPERTY_ACCESS);
            expect(() => {
                Reflect.defineProperty(masked, LOCKER_NEAR_MEMBRANE_IS_MASKED_SYMBOL, {
                    configurable: true,
                    enumerable: true,
                    value: true,
                    writable: true,
                });
            }).toThrow(ERR_ILLEGAL_PROPERTY_ACCESS);
            delete masked[LOCKER_NEAR_MEMBRANE_IS_MASKED_SYMBOL];
            bogusMask[LOCKER_NEAR_MEMBRANE_IS_MASKED_SYMBOL] = true;
            expect(() => LOCKER_NEAR_MEMBRANE_IS_MASKED_SYMBOL in masked).toThrow(
                ERR_ILLEGAL_PROPERTY_ACCESS
            );
            expect(() => masked[LOCKER_NEAR_MEMBRANE_IS_MASKED_SYMBOL]).toThrow(
                ERR_ILLEGAL_PROPERTY_ACCESS
            );
            expect(() =>
                Reflect.getOwnPropertyDescriptor(masked, LOCKER_NEAR_MEMBRANE_IS_MASKED_SYMBOL)
            ).toThrow(ERR_ILLEGAL_PROPERTY_ACCESS);
            delete bogusMask[LOCKER_NEAR_MEMBRANE_IS_MASKED_SYMBOL];
        });
    });
});
