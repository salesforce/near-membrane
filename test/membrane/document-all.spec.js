import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('document.all', () => {
    it('should preserve the typeof it since it is a common test for older browsers', () => {
        expect.assertions(2);

        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        expect(typeof document.all).toBe('undefined');

        env.evaluate(`
            expect(typeof document.all).toBe('undefined');
        `);
    });
    it('should disable the feature entirely inside the sandbox', () => {
        expect.assertions(35);

        Object.defineProperties(window, {
            allGetter: {
                configurable: true,
                get() {
                    return document.all;
                },
            },
            allInherited: {
                configurable: true,
                value: Object.create(document.all),
            },
            allValue: {
                configurable: true,
                value: document.all,
            },
        });

        const env = createVirtualEnvironment(window, {
            endowments: {
                callOutsideWithZeroArgs: {
                    value: (func) => func.call(document.all),
                },
                callOutsideWithOneArg: {
                    value: (func) => func.call(document.all, document.all),
                },
                callOutsideWithTwoArgs: {
                    value: (func) => func.call(document.all, document.all, document.all),
                },
                callOutsideWithThreeArgs: {
                    value: (func) =>
                        func.call(document.all, document.all, document.all, document.all),
                },
                callOutsideWithFourArgs: {
                    value: (func) =>
                        func.call(
                            document.all,
                            document.all,
                            document.all,
                            document.all,
                            document.all
                        ),
                },
                callOutsideWithFiveArgs: {
                    value: (func) =>
                        func.call(
                            document.all,
                            document.all,
                            document.all,
                            document.all,
                            document.all,
                            document.all
                        ),
                },
                constructOutsideWithZeroArgsAndNewTarget: {
                    value: (func) => {
                        expect(() => Reflect.construct(func, [], document.all)).toThrowError(
                            TypeError
                        );
                    },
                },
                constructOutsideWithOneArg: {
                    value: (func) => Reflect.construct(func, [document.all]),
                },
                constructOutsideWithTwoArgs: {
                    value: (func) => Reflect.construct(func, [document.all, document.all]),
                },
                constructOutsideWithThreeArgs: {
                    value: (func) =>
                        Reflect.construct(func, [document.all, document.all, document.all]),
                },
                constructOutsideWithFourArgs: {
                    value: (func) =>
                        Reflect.construct(func, [
                            document.all,
                            document.all,
                            document.all,
                            document.all,
                        ]),
                },
                constructOutsideWithFiveArgs: {
                    value: (func) =>
                        Reflect.construct(func, [
                            document.all,
                            document.all,
                            document.all,
                            document.all,
                            document.all,
                        ]),
                },
                defineOutside: {
                    value: (object) => {
                        Reflect.defineProperty(object, 'all', {
                            configurable: true,
                            enumerable: true,
                            value: document.all,
                            writable: true,
                        });
                        expect(object.all).toBeUndefined();
                    },
                },
                endowmentAllGetter: {
                    get() {
                        return document.all;
                    },
                },
                endowmentAllInherited: {
                    value: Object.create(document.all),
                },
                endowmentAllValue: {
                    value: document.all,
                },
                endowmentOriginalAllGetter: {
                    // eslint-disable-next-line no-underscore-dangle
                    value: document.__lookupGetter__('all'),
                },
                setOutside: {
                    value: (object) => {
                        object.all = document.all;
                        expect(object.all).toBeUndefined();
                    },
                },
            },
            globalObjectShape: window,
        });

        env.evaluate(`
            'use strict';

            class ExoticObject {
                constructor(source) {
                    if (source) {
                        Object.defineProperties(this, Object.getOwnPropertyDescriptors(source));
                    }
                }
            }

            expect(document.all).toBeUndefined();
            expect(allGetter).toBeUndefined();
            expect(Reflect.getPrototypeOf(allInherited)).toBe(null);
            expect(allValue).toBeUndefined();
            const { value: allValueDescValue } = Reflect.getOwnPropertyDescriptor(window, 'allValue');
            expect(allValueDescValue).toBeUndefined();

            expect(endowmentAllGetter).toBeUndefined();
            expect(Reflect.getPrototypeOf(endowmentAllInherited)).toBe(null);
            expect(endowmentAllValue).toBeUndefined();
            const { value: endowmentAllValueDescValue } = Reflect.getOwnPropertyDescriptor(window, 'endowmentAllValue');
            expect(endowmentAllValueDescValue).toBeUndefined();
            const DocumentProtoAllDesc = Reflect.getOwnPropertyDescriptor(Document.prototype, 'all');
            expect(DocumentProtoAllDesc).toEqual({
                configurable: true,
                enumerable: true,
                get: endowmentOriginalAllGetter,
                set: undefined,
            });
            const getter = DocumentProtoAllDesc?.get ?? (() => {});
            expect(Reflect.apply(getter, document, [])).toBeUndefined();

            callOutsideWithZeroArgs(function () {
                expect(this).toBeUndefined();
            });
            callOutsideWithOneArg(function (arg0) {
                expect([this, arg0]).toEqual([undefined, undefined]);
            });
            callOutsideWithTwoArgs(function (arg0, arg1) {
                expect([this, arg0, arg1]).toEqual([undefined, undefined, undefined]);
            });
            callOutsideWithThreeArgs(function (arg0, arg1, arg2) {
                expect([this, arg0, arg1, arg2]).toEqual([
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                ]);
            });
            callOutsideWithFourArgs(function (arg0, arg1, arg2, arg3) {
                expect([this, arg0, arg1, arg2, arg3]).toEqual([
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                ]);
            });
            callOutsideWithFiveArgs(function (arg0, arg1, arg2, arg3, arg4) {
                expect([this, arg0, arg1, arg2, arg3, arg4]).toEqual([
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                ]);
            });

            constructOutsideWithZeroArgsAndNewTarget(function Ctor() {});
            constructOutsideWithOneArg(function Ctor(arg0) {
                expect([new.target, arg0]).toEqual([Ctor, undefined]);
            });
            constructOutsideWithTwoArgs(function Ctor(arg0, arg1) {
                expect([new.target, arg0, arg1]).toEqual([Ctor, undefined, undefined]);
            });
            constructOutsideWithThreeArgs(function Ctor(arg0, arg1, arg2) {
                expect([new.target, arg0, arg1, arg2]).toEqual([
                    Ctor,
                    undefined,
                    undefined,
                    undefined,
                ]);
            });
            constructOutsideWithFourArgs(function Ctor(arg0, arg1, arg2, arg3) {
                expect([new.target, arg0, arg1, arg2, arg3]).toEqual([
                    Ctor,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                ]);
            });
            constructOutsideWithFourArgs(function Ctor(arg0, arg1, arg2, arg3, arg4) {
                expect([new.target, arg0, arg1, arg2, arg3, arg4]).toEqual([
                    Ctor,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                ]);
            });

            const plainObjectForDefineProperty = {};
            defineOutside(plainObjectForDefineProperty);
            expect(plainObjectForDefineProperty.all).toBeUndefined();

            const exoticObjectForDefineProperty = new ExoticObject();
            defineOutside(exoticObjectForDefineProperty);
            expect(exoticObjectForDefineProperty.all).toBeUndefined();

            const plainObjectForSet = {};
            setOutside(plainObjectForSet);
            expect(plainObjectForSet.all).toBeUndefined();
            setOutside({
                set all(value) {
                    expect(value).toBeUndefined();
                },
            });
            const exoticObjectForSet = new ExoticObject();
            setOutside(exoticObjectForSet);
            expect(exoticObjectForSet.all).toBeUndefined();
            setOutside(new ExoticObject({
                set all(value) {
                    expect(value).toBeUndefined();
                },
            }));
        `);

        delete window.allGetter;
        delete window.allInherited;
        delete window.allValue;
    });
});
