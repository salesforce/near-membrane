import {
    ERR_ILLEGAL_PROPERTY_ACCESS,
    isProxyMaskedFunction,
    LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL,
    noop,
    proxyMaskFunction,
} from '../../dist/index.mjs.js';

describe('Function', () => {
    it('isProxyMaskedFunction', () => {
        expect(isProxyMaskedFunction({})).toBe(false);
        expect(isProxyMaskedFunction(null)).toBe(false);
        expect(isProxyMaskedFunction(undefined)).toBe(false);
        const func = () => 'func';
        func[LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL] = true;
        expect(isProxyMaskedFunction(func)).toBe(false);
        const mask = () => 'mask';
        expect(isProxyMaskedFunction(mask)).toBe(false);
        const masked = proxyMaskFunction(func, mask);
        expect(isProxyMaskedFunction(masked)).toBe(true);
    });

    it('noop', () => {
        expect(noop()).toBe(undefined);
        expect(noop(null)).toBe(undefined);
        expect(noop(true)).toBe(undefined);
        expect(noop(1)).toBe(undefined);
        expect(noop({})).toBe(undefined);
    });

    describe('proxyMaskFunction', () => {
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
            const proxyMasked = proxyMaskFunction(() => 'a', mask);
            expect(proxyMasked.name).toBe(mask.name);
            expect(proxyMasked()).toBe('a');
            expect(Reflect.ownKeys(proxyMasked)).toEqual(Reflect.ownKeys(mask));
            expect(Reflect.getOwnPropertyDescriptor(proxyMasked, 'z')).toEqual(
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
            const proxyMasked = proxyMaskFunction(() => 'a', mask);
            const proxyMaskedFrozen = proxyMaskFunction(() => 'a', frozenMask);
            const proxyMaskedSealed = proxyMaskFunction(() => 'a', sealedMask);

            expect(Object.isFrozen(proxyMaskedFrozen)).toBe(true);
            expect(Object.isExtensible(proxyMaskedFrozen)).toBe(false);
            expect(Object.isFrozen(proxyMaskedSealed)).toBe(false);
            expect(Object.isExtensible(proxyMaskedSealed)).toBe(false);
            expect(Object.isSealed(proxyMaskedSealed)).toBe(true);

            proxyMasked.x = 1;
            expect(proxyMasked.x).toBe(1);
            expect(mask.x).toBe(1);
            expect(Reflect.deleteProperty(proxyMasked, 'x')).toBe(true);
            expect('x' in proxyMasked).toBe(false);
            expect('x' in mask).toBe(false);

            expect(Reflect.getPrototypeOf(proxyMasked)).toBe(maskProto);
            expect(Reflect.setPrototypeOf(proxyMasked, null)).toBe(true);
            expect(Reflect.getPrototypeOf(proxyMasked)).toBe(null);
            expect(Reflect.getPrototypeOf(mask)).toBe(null);
            Reflect.setPrototypeOf(mask, maskProto);

            expect(Reflect.preventExtensions(proxyMasked)).toBe(true);
            expect(Object.isExtensible(proxyMasked)).toBe(false);
            expect(Object.isExtensible(mask)).toBe(false);
        });

        it('should convert `this` of `mask` to `func`', () => {
            function mask() {
                return this;
            }
            function func() {
                return this;
            }
            const proxyMasked = proxyMaskFunction(func, mask);
            expect(Reflect.apply(proxyMasked, proxyMasked, [])).toBe(func);
            expect(Reflect.apply(proxyMasked, mask, [])).toBe(func);
        });

        it('should mask class properties', () => {
            class maskClass {}
            const proxyMasked = proxyMaskFunction(class funcClass {}, maskClass);
            expect(proxyMasked.name).toBe(maskClass.name);
            expect(proxyMasked.prototype).toBe(maskClass.prototype);
        });

        it('should convert `new.target` of `mask` to `func`', () => {
            expect.assertions(2);

            class maskClass {}
            const proxyMasked = proxyMaskFunction(
                class funcClass {
                    constructor() {
                        expect(new.target).toBe(funcClass);
                    }
                },
                maskClass
            );
            Reflect.construct(proxyMasked, [], proxyMasked);
            Reflect.construct(proxyMasked, [], maskClass);
        });

        it('should accept "apply" trap invokers', () => {
            expect.assertions(8);

            function mask() {
                return this;
            }
            function func() {
                return this;
            }
            const proxyMasked = proxyMaskFunction(func, mask, {
                apply(target, thisArg, args) {
                    expect(target).toBe(func);
                    expect(thisArg).toBe(func);
                    expect(args).toEqual(['a']);
                    return Reflect.apply(target, thisArg, args);
                },
            });
            expect(Reflect.apply(proxyMasked, proxyMasked, ['a'])).toBe(func);
            expect(Reflect.apply(proxyMasked, mask, ['a'])).toBe(func);
        });

        it('should accept "construct" trap invokers', () => {
            expect.assertions(8);

            class maskClass {}
            class theClass {
                constructor() {
                    expect(new.target).toBe(theClass);
                }
            }
            const proxyMasked = proxyMaskFunction(theClass, maskClass, {
                construct(target, args, newTarget) {
                    expect(target).toBe(theClass);
                    expect(args).toEqual(['a']);
                    expect(newTarget).toBe(theClass);
                    return Reflect.construct(target, args, newTarget);
                },
            });
            Reflect.construct(proxyMasked, ['a'], proxyMasked);
            Reflect.construct(proxyMasked, ['a'], maskClass);
        });

        it('should accept "get" trap invokers', () => {
            expect.assertions(4);

            function mask() {
                return 'A';
            }
            function func() {
                return 'a';
            }
            const proxyMasked = proxyMaskFunction(func, mask, {
                get(target, key, receiver, handshake) {
                    if (key === 'test') {
                        expect(target).toBe(mask);
                        expect(receiver).toBe(proxyMasked);
                        expect(handshake).toBe(false);
                        return 'testResult';
                    }
                    return Reflect.get(target, key, receiver);
                },
            });
            expect(proxyMasked.test).toBe('testResult');
        });

        it('should accept "has" trap invokers', () => {
            expect.assertions(2);

            function mask() {
                return 'A';
            }
            function func() {
                return 'a';
            }
            const proxyMasked = proxyMaskFunction(func, mask, {
                has(target, key) {
                    if (key === 'test') {
                        expect(target).toBe(mask);
                        return true;
                    }
                    return Reflect.has(target, key);
                },
            });
            expect('test' in proxyMasked).toBe(true);
        });

        it('should not allow `LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL` forgeries', () => {
            const bogusMask = () => 'bogusMask';
            const proxyMasked = proxyMaskFunction(() => 1, bogusMask);
            expect(() => {
                proxyMasked[LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL] = true;
            }).toThrowError(ERR_ILLEGAL_PROPERTY_ACCESS);
            expect(() => {
                Reflect.defineProperty(proxyMasked, LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL, {
                    configurable: true,
                    enumerable: true,
                    value: true,
                    writable: true,
                });
            }).toThrowError(ERR_ILLEGAL_PROPERTY_ACCESS);
            delete proxyMasked[LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL];
            bogusMask[LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL] = true;
            expect(() => LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL in proxyMasked).toThrowError(
                ERR_ILLEGAL_PROPERTY_ACCESS
            );
            expect(() => proxyMasked[LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL]).toThrowError(
                ERR_ILLEGAL_PROPERTY_ACCESS
            );
            expect(() =>
                Reflect.getOwnPropertyDescriptor(
                    proxyMasked,
                    LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL
                )
            ).toThrowError(ERR_ILLEGAL_PROPERTY_ACCESS);
            delete bogusMask[LOCKER_NEAR_MEMBRANE_PROXY_MASKED_SYMBOL];
        });
    });
});
