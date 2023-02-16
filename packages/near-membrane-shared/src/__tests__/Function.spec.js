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
            const proxyMasked = proxyMaskFunction(() => 'a', mask);
            expect(proxyMasked.name).toBe(mask.name);
            expect(proxyMasked()).toBe('a');
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
        });
    });
});
