import createVirtualEnvironment from '@locker/near-membrane-dom';

const LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL = Symbol.for(
    '@@lockerNearMembraneSerializedValue'
);
const LOCKER_NEAR_MEMBRANE_SYMBOL = Symbol.for('@@lockerNearMembrane');
const { toStringTag: TO_STRING_TAG_SYMBOL } = Symbol;

function customizeToStringTag(object) {
    Reflect.defineProperty(object, TO_STRING_TAG_SYMBOL, {
        configurable: true,
        enumerable: false,
        value: 'Custom',
        writable: true,
    });
    return object;
}

function freezeObject(object, inheritFrom = Reflect.getPrototypeOf(object)) {
    const frozenProto = Object.create(inheritFrom);
    Object.freeze(frozenProto);
    Reflect.setPrototypeOf(object, frozenProto);
    Object.freeze(object);
    return object;
}

describe('@@lockerNearMembrane', () => {
    it('should be detectable', () => {
        expect.assertions(15);

        let takeInside;
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({
                expect,
                exposeTakeInside(func) {
                    takeInside = func;
                },
                takeOutside(insideValue) {
                    // Test blue proxies.
                    // To unlock the near-membrane symbol flag first perform a
                    // has() trap check.
                    expect(LOCKER_NEAR_MEMBRANE_SYMBOL in insideValue).toBe(false);
                    // Next, perform a get() trap call.
                    expect(insideValue[LOCKER_NEAR_MEMBRANE_SYMBOL]).toBe(true);
                    // Performing a get() trap call without first performing a
                    // has() trap check will produce `undefined`.
                    expect(insideValue[LOCKER_NEAR_MEMBRANE_SYMBOL]).toBe(undefined);
                },
            }),
        });

        env.evaluate(`
            const LOCKER_NEAR_MEMBRANE_SYMBOL = Symbol.for('@@lockerNearMembrane');

            exposeTakeInside(function takeInside(outsideValue) {
                // Test red proxies.
                expect(LOCKER_NEAR_MEMBRANE_SYMBOL in outsideValue).toBe(false);
                expect(outsideValue[LOCKER_NEAR_MEMBRANE_SYMBOL]).toBe(undefined);
            });
        `);

        // Test red proxies.
        takeInside({ outsideObject: 1 });
        takeInside(Object.create(null, { outsideObjectWithNullProto: { value: 1 } }));
        takeInside(['outsideArray']);

        env.evaluate(`
            // Test blue proxies.
            takeOutside({ insideObject: 1 });
            takeOutside(Object.create(null, { insideObjectWithNullProto: { value: 1 } }));
            takeOutside(['insideArray']);
        `);
    });

    it('should not be detectable when customized', () => {
        expect.assertions(12);

        let takeInside;
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({
                expect,
                exposeTakeInside(func) {
                    takeInside = func;
                },
                takeOutside(insideValue, expectedSymbolValue) {
                    // Test blue proxies.
                    expect(LOCKER_NEAR_MEMBRANE_SYMBOL in insideValue).toBe(true);
                    expect(insideValue[LOCKER_NEAR_MEMBRANE_SYMBOL]).toBe(expectedSymbolValue);
                },
            }),
        });

        env.evaluate(`
            const LOCKER_NEAR_MEMBRANE_SYMBOL = Symbol.for('@@lockerNearMembrane');

            exposeTakeInside(function takeInside(outsideValue, expectedSymbolValue) {
                // Test red proxies.
                expect(LOCKER_NEAR_MEMBRANE_SYMBOL in outsideValue).toBe(true);
                expect(outsideValue[LOCKER_NEAR_MEMBRANE_SYMBOL]).toBe(expectedSymbolValue);
            });
        `);

        // Test red proxies.
        const outsideObjectSymbolValue = 'outsideObject';
        const outsideObject = { [LOCKER_NEAR_MEMBRANE_SYMBOL]: outsideObjectSymbolValue };
        takeInside(outsideObject, outsideObjectSymbolValue);

        const outsideObjectWithNullProtoSymbolValue = 'outsideObjectWithNullProto';
        const outsideObjectWithNullProto = Object.create(null, {
            [LOCKER_NEAR_MEMBRANE_SYMBOL]: { value: outsideObjectWithNullProtoSymbolValue },
        });
        takeInside(outsideObjectWithNullProto, outsideObjectWithNullProtoSymbolValue);

        const outsideArraySymbolValue = 'outsideArray';
        const outsideArray = [];
        outsideArray[LOCKER_NEAR_MEMBRANE_SYMBOL] = outsideArraySymbolValue;
        takeInside(outsideArray, outsideArraySymbolValue);

        env.evaluate(`
            const LOCKER_NEAR_MEMBRANE_SYMBOL = Symbol.for('@@lockerNearMembrane');

            // Test blue proxies.
            const insideObjectSymbolValue = 'insideObject';
            const insideObject = { [LOCKER_NEAR_MEMBRANE_SYMBOL]: insideObjectSymbolValue };
            takeOutside(insideObject, insideObjectSymbolValue);

            const insideObjectWithNullProtoSymbolValue = 'insideObjectWithNullProto';
            const insideObjectWithNullProto = Object.create(null, {
                [LOCKER_NEAR_MEMBRANE_SYMBOL]: { value: insideObjectWithNullProtoSymbolValue },
            });
            takeOutside(insideObjectWithNullProto, insideObjectWithNullProtoSymbolValue);

            const insideArraySymbolValue = 'insideArray';
            const insideArray = [];
            insideArray[LOCKER_NEAR_MEMBRANE_SYMBOL] = insideArraySymbolValue;
            takeOutside(insideArray, insideArraySymbolValue);
        `);
    });

    it('should not throw proxy invariant violation errors', () => {
        expect.assertions(15);

        let takeInside;
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({
                expect,
                exposeTakeInside(func) {
                    takeInside = func;
                },
                takeOutside(insideValue) {
                    // Test blue proxies.
                    // To unlock the near-membrane symbol flag first perform a
                    // has() trap check.
                    expect(LOCKER_NEAR_MEMBRANE_SYMBOL in insideValue).toBe(false);
                    // Next, perform a get() trap call.
                    expect(insideValue[LOCKER_NEAR_MEMBRANE_SYMBOL]).toBe(true);
                    // Performing a get() trap call without first performing a
                    // has() trap check will produce `undefined`.
                    expect(insideValue[LOCKER_NEAR_MEMBRANE_SYMBOL]).toBe(undefined);
                },
            }),
        });

        env.evaluate(`
            const LOCKER_NEAR_MEMBRANE_SYMBOL = Symbol.for('@@lockerNearMembrane');

            exposeTakeInside(function takeInside(outsideValue) {
                // Test red proxies.
                expect(LOCKER_NEAR_MEMBRANE_SYMBOL in outsideValue).toBe(false);
                expect(outsideValue[LOCKER_NEAR_MEMBRANE_SYMBOL]).toBe(undefined);
            });
        `);

        // Test red proxies.
        takeInside(freezeObject({ outsideFrozenObject: 1 }));
        takeInside(freezeObject({ outsideFrozenObjectWithNullProto: 1 }, null));
        takeInside(freezeObject(['outsideFrozenArray']));

        env.evaluate(`
            function freezeObject(object, inheritFrom = Reflect.getPrototypeOf(object)) {
                const frozenProto = Object.create(inheritFrom);
                Object.freeze(frozenProto);
                Reflect.setPrototypeOf(object, frozenProto);
                Object.freeze(object);
                return object;
            }

            // Test blue proxies.
            takeOutside(freezeObject({ insideFrozenObject: 1 }));
            takeOutside(freezeObject({ insideFrozenObjectWithNullProto: 1 }, null));
            takeOutside(freezeObject(['insideFrozenArray']));
        `);
    });
});

describe('@@lockerNearMembraneSerializedValue', () => {
    it('should be detectable', () => {
        expect.assertions(45);

        let takeInside;
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({
                expect,
                exposeTakeInside(func) {
                    takeInside = func;
                },
                takeOutside(insideValue, expectedSerialized) {
                    // Test blue proxies.
                    // To unlock the near-membrane symbol flag first perform a
                    // has() trap check.
                    expect(LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL in insideValue).toBe(false);
                    // Next, perform a get() trap call.
                    expect(insideValue[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL]).toBe(
                        expectedSerialized
                    );
                    // Performing a get() trap call without first performing a
                    // has() trap check will produce `undefined`.
                    expect(insideValue[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL]).toBe(
                        undefined
                    );
                },
            }),
        });

        env.evaluate(`
            const LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL = Symbol.for(
                '@@lockerNearMembraneSerializedValue'
            );

            exposeTakeInside(function takeInside(outsideValue) {
                // Test red proxies.
                expect(LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL in outsideValue).toBe(false);
                expect(outsideValue[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL]).toBe(undefined);
            });
        `);

        // Test red proxies.
        takeInside(Object(BigInt(0x1fffffffffffff)));
        // eslint-disable-next-line no-new-wrappers
        takeInside(new Boolean(true));
        // eslint-disable-next-line no-new-wrappers
        takeInside(new Boolean(false));
        // eslint-disable-next-line no-new-wrappers
        takeInside(new Number(0));
        // prettier-ignore
        takeInside(/outsideRegExpLiteral/img);
        // eslint-disable-next-line prefer-regex-literals
        takeInside(new RegExp('outsideRegExpObject', 'img'));
        // eslint-disable-next-line no-new-wrappers
        takeInside(new String('outsideString'));
        const symbol = Symbol('outsideSymbol');
        takeInside(Object(symbol));
        takeInside(['outsideArray']);

        env.evaluate(`
            // Test blue proxies.
            takeOutside(Object(BigInt(0x1fffffffffffff)), BigInt(0x1fffffffffffff));
            takeOutside(new Boolean(true), true);
            takeOutside(new Boolean(false), false);
            takeOutside(new Number(0), 0);
            takeOutside(
                /insideRegExpLiteral/ysu,
                JSON.stringify({
                    flags: 'suy',
                    source: 'insideRegExpLiteral',
                })
            );
            takeOutside(
                new RegExp('insideRegExpObject', 'ysu'),
                JSON.stringify({
                    flags: 'suy',
                    source: 'insideRegExpObject',
                })
            );
            takeOutside(new String('insideString'), 'insideString');
            const symbol = Symbol('insideSymbol');
            takeOutside(Object(symbol), symbol);
            takeOutside(['insideArray'], undefined);
        `);
    });

    it('should be detectable with blue proxies of other realms', () => {
        expect.assertions(45);

        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts');
        document.body.appendChild(iframe);
        const { contentWindow: blueIframeWindow } = iframe;

        let bluePairs;
        let env = createVirtualEnvironment(blueIframeWindow, {
            endowments: Object.getOwnPropertyDescriptors({
                exposePairs(insidePairs) {
                    bluePairs = insidePairs;
                },
            }),
            globalObjectShape: blueIframeWindow,
        });

        env.evaluate(`
            const symbol = Symbol('insideSymbol');
            exposePairs([
                [Object(BigInt(0x1fffffffffffff)), BigInt(0x1fffffffffffff)],
                [new Boolean(true), true],
                [new Boolean(false), false],
                [new Number(0), 0],
                [
                    /insideRegExpLiteral/ysu,
                    JSON.stringify({
                        flags: 'suy',
                        source: 'insideRegExpLiteral',
                    })
                ],
                [
                    new RegExp('insideRegExpObject', 'ysu'),
                    JSON.stringify({
                        flags: 'suy',
                        source: 'insideRegExpObject',
                    })
                ],
                [new String('insideString'), 'insideString'],
                [Object(symbol), symbol],
                [['insideArray'], undefined],
            ])
        `);

        let takeInside;
        env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({
                expect,
                exposeTakeInside(func) {
                    takeInside = func;
                },
                injectPairs(func) {
                    func(bluePairs);
                },
                takeOutside(insideValue, expectedSerialized) {
                    // Test blue proxies.
                    // To unlock the near-membrane symbol flag first perform a
                    // has() trap check.
                    expect(LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL in insideValue).toBe(false);
                    // Next, perform a get() trap call.
                    expect(insideValue[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL]).toBe(
                        expectedSerialized
                    );
                    // Performing a get() trap call without first performing a
                    // has() trap check will produce `undefined`.
                    expect(insideValue[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL]).toBe(
                        undefined
                    );
                },
            }),
        });

        env.evaluate(`
            const LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL = Symbol.for(
                '@@lockerNearMembraneSerializedValue'
            );

            exposeTakeInside(function takeInside(outsideValue) {
                // Test red proxies.
                expect(LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL in outsideValue).toBe(false);
                expect(outsideValue[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL]).toBe(undefined);
            });
        `);

        // Test red proxies.
        for (const { 0: value } of bluePairs) {
            takeInside(value);
        }

        env.evaluate(`
            let magentaPairs
            injectPairs((outsideMagentaPairs) => {
                magentaPairs = outsideMagentaPairs;
            });
            // Test blue proxies.
            for (const { 0: magentaValue, 1: expectedSerialized } of magentaPairs) {
                takeOutside(magentaValue, expectedSerialized);
            }
        `);

        iframe.remove();
    });

    it('should be detectable with custom Symbol.toStringTag value', () => {
        expect.assertions(45);

        let takeInside;
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({
                expect,
                exposeTakeInside(func) {
                    takeInside = func;
                },
                takeOutside(insideValue, expectedSerialized) {
                    // Test blue proxies.
                    // To unlock the near-membrane symbol flag first perform a
                    // has() trap check.
                    expect(LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL in insideValue).toBe(false);
                    // Next, perform a get() trap call.
                    expect(insideValue[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL]).toBe(
                        expectedSerialized
                    );
                    // Performing a get() trap call without first performing a
                    // has() trap check will produce `undefined`.
                    expect(insideValue[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL]).toBe(
                        undefined
                    );
                },
            }),
        });

        env.evaluate(`
            const LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL = Symbol.for(
                '@@lockerNearMembraneSerializedValue'
            );

            exposeTakeInside(function takeInside(outsideValue) {
                // Test red proxies.
                expect(LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL in outsideValue).toBe(false);
                expect(outsideValue[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL]).toBe(undefined);
            });
        `);

        // Test red proxies.
        takeInside(customizeToStringTag(Object(BigInt(0x1fffffffffffff))));
        // eslint-disable-next-line no-new-wrappers
        takeInside(customizeToStringTag(new Boolean(true)));
        // eslint-disable-next-line no-new-wrappers
        takeInside(customizeToStringTag(new Boolean(false)));
        // eslint-disable-next-line no-new-wrappers
        takeInside(customizeToStringTag(new Number(0)));
        // prettier-ignore
        takeInside(customizeToStringTag(/outsideRegExpLiteral/img));
        // eslint-disable-next-line prefer-regex-literals
        takeInside(new RegExp('outsideRegExp', 'img'));
        // eslint-disable-next-line no-new-wrappers
        takeInside(customizeToStringTag(new String('outsideStringObject')));
        takeInside(customizeToStringTag(Object(Symbol('outsideSymbolObject'))));
        takeInside(customizeToStringTag(['outsideArray']));

        env.evaluate(`
            const { toStringTag: TO_STRING_TAG_SYMBOL } = Symbol;

            function customizeToStringTag(object) {
                Reflect.defineProperty(object, TO_STRING_TAG_SYMBOL, {
                    configurable: true,
                    enumerable: false,
                    value: 'Custom',
                    writable: true,
                });
                return object;
            }

            // Test blue proxies.
            takeOutside(
                customizeToStringTag(Object(BigInt(0x1fffffffffffff))),
                BigInt(0x1fffffffffffff)
            );
            takeOutside(customizeToStringTag(new Boolean(true)), true);
            takeOutside(customizeToStringTag(new Boolean(false)), false);
            takeOutside(customizeToStringTag(new Number(0)), 0);
            takeOutside(
                customizeToStringTag(/insideRegExpLiteral/ysu),
                JSON.stringify({
                    flags: 'suy',
                    source: 'insideRegExpLiteral',
                })
            );
            takeOutside(
                customizeToStringTag(
                    new RegExp('insideRegExpObject', 'ysu')
                ),
                JSON.stringify({
                    flags: 'suy',
                    source: 'insideRegExpObject',
                })
            );
            takeOutside(customizeToStringTag(new String('insideString')), 'insideString');
            const symbol = Symbol('insideSymbol');
            takeOutside(customizeToStringTag(Object(symbol)), symbol);
            takeOutside(customizeToStringTag(['insideArray']), undefined);
        `);
    });

    it('should be detectable with no Symbol.toStringTag value', () => {
        expect.assertions(10);

        let takeInside;
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({
                expect,
                exposeTakeInside(func) {
                    takeInside = func;
                },
                takeOutside(insideValue, expectedSerialized) {
                    // Test blue proxies.
                    // To unlock the near-membrane symbol flag first perform a
                    // has() trap check.
                    expect(LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL in insideValue).toBe(false);
                    // Next, perform a get() trap call.
                    expect(insideValue[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL]).toBe(
                        expectedSerialized
                    );
                    // Performing a get() trap call without first performing a
                    // has() trap check will produce `undefined`.
                    expect(insideValue[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL]).toBe(
                        undefined
                    );
                },
            }),
        });

        env.evaluate(`
            const LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL = Symbol.for(
                '@@lockerNearMembraneSerializedValue'
            );

            exposeTakeInside(function takeInside(outsideValue) {
                // Test red proxies.
                expect(LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL in outsideValue).toBe(false);
                expect(outsideValue[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL]).toBe(undefined);
            });
        `);

        const BigIntProtoSymbolToStringTagDescriptor = Reflect.getOwnPropertyDescriptor(
            BigInt.prototype,
            TO_STRING_TAG_SYMBOL
        );
        const SymbolProtoSymbolToStringTagDescriptor = Reflect.getOwnPropertyDescriptor(
            Symbol.prototype,
            TO_STRING_TAG_SYMBOL
        );
        delete BigInt.prototype[TO_STRING_TAG_SYMBOL];
        delete Symbol.prototype[TO_STRING_TAG_SYMBOL];

        // Test red proxies.
        takeInside(Object(BigInt(0x1fffffffffffff)));
        takeInside(Object(Symbol('outsideSymbolObject')));

        Reflect.defineProperty(
            BigInt.prototype,
            TO_STRING_TAG_SYMBOL,
            BigIntProtoSymbolToStringTagDescriptor
        );
        Reflect.defineProperty(
            Symbol.prototype,
            TO_STRING_TAG_SYMBOL,
            SymbolProtoSymbolToStringTagDescriptor
        );

        env.evaluate(`
            const { toStringTag: TO_STRING_TAG_SYMBOL } = Symbol;
            const BigIntProtoSymbolToStringTagDescriptor = Reflect.getOwnPropertyDescriptor(
                BigInt.prototype,
                TO_STRING_TAG_SYMBOL
            );
            const SymbolProtoSymbolToStringTagDescriptor = Reflect.getOwnPropertyDescriptor(
                Symbol.prototype,
                TO_STRING_TAG_SYMBOL
            );
            delete BigInt.prototype[TO_STRING_TAG_SYMBOL];
            delete Symbol.prototype[TO_STRING_TAG_SYMBOL];

            // Test blue proxies.
            takeOutside(Object(BigInt(0x1fffffffffffff)), BigInt(0x1fffffffffffff));
            const symbol = Symbol('insideSymbol');
            takeOutside(Object(symbol), symbol);

            Reflect.defineProperty(
                BigInt.prototype,
                TO_STRING_TAG_SYMBOL,
                BigIntProtoSymbolToStringTagDescriptor
            );
            Reflect.defineProperty(
                Symbol.prototype,
                TO_STRING_TAG_SYMBOL,
                SymbolProtoSymbolToStringTagDescriptor
            );
        `);
    });

    it('should not be detectable with custom @@lockerNearMembraneSerializedValue value', () => {
        expect.assertions(36);

        let takeInside;
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({
                expect,
                exposeTakeInside(func) {
                    takeInside = func;
                },
                takeOutside(insideValue, expectedSymbolValue) {
                    // Test blue proxies.
                    expect(LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL in insideValue).toBe(true);
                    expect(insideValue[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL]).toBe(
                        expectedSymbolValue
                    );
                },
            }),
        });

        env.evaluate(`
            const LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL = Symbol.for(
                '@@lockerNearMembraneSerializedValue'
            );

            exposeTakeInside(function takeInside(outsideValue, expectedSymbolValue) {
                // Test red proxies.
                expect(LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL in outsideValue).toBe(true);
                expect(outsideValue[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL]).toBe(
                    expectedSymbolValue
                );
            });
        `);
        // Test blue proxies.
        const outsideBigIntObjectSymbolValue = 'outsideBigIntObject';
        const outsideBigIntObject = Object(BigInt(0x1fffffffffffff));
        outsideBigIntObject[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL] =
            outsideBigIntObjectSymbolValue;
        takeInside(outsideBigIntObject, outsideBigIntObjectSymbolValue);

        const outsideBooleanTrueObjectSymbolValue = 'outsideBooleanTrueObject';
        // eslint-disable-next-line no-new-wrappers
        const outsideBooleanTrueObject = new Boolean(true);
        outsideBooleanTrueObject[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL] =
            outsideBooleanTrueObjectSymbolValue;
        takeInside(outsideBooleanTrueObject, outsideBooleanTrueObjectSymbolValue);

        const outsideBooleanFalseObjectSymbolValue = 'outsideBooleanFalseObject';
        // eslint-disable-next-line no-new-wrappers
        const outsideBooleanFalseObject = new Boolean(false);
        outsideBooleanFalseObject[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL] =
            outsideBooleanFalseObjectSymbolValue;
        takeInside(outsideBooleanFalseObject, outsideBooleanFalseObjectSymbolValue);

        const outsideNumberObjectSymbolValue = 'outsideNumberObject';
        // eslint-disable-next-line no-new-wrappers
        const outsideNumberObject = new Number(0);
        outsideNumberObject[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL] =
            outsideNumberObjectSymbolValue;
        takeInside(outsideNumberObject, outsideNumberObjectSymbolValue);
        const outsideRegExpLiteralSymbolValue = 'outsideRegExpLiteral';

        // prettier-ignore
        const outsideRegExpLiteral = /outsideRegExpLiteral/img;
        outsideRegExpLiteral[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL] =
            outsideRegExpLiteralSymbolValue;
        takeInside(outsideRegExpLiteral, outsideRegExpLiteralSymbolValue);

        const outsideRegExpObjectSymbolValue = 'outsideRegExpObject';
        // eslint-disable-next-line prefer-regex-literals
        const outsideRegExpObject = new RegExp('outsideRegExpObject', 'img');
        outsideRegExpObject[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL] =
            outsideRegExpObjectSymbolValue;
        takeInside(outsideRegExpObject, outsideRegExpObjectSymbolValue);

        const outsideStringObjectSymbolValue = 'outsideStringObject';
        // eslint-disable-next-line no-new-wrappers
        const outsideStringObject = new String('outsideString');
        outsideStringObject[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL] =
            outsideStringObjectSymbolValue;
        takeInside(outsideStringObject, outsideStringObjectSymbolValue);

        const outsideSymbolObjectSymbolValue = 'outsideSymbolObject';
        // eslint-disable-next-line no-new-wrappers
        const outsideSymbolObject = Object(Symbol('outsideSymbol'));
        outsideSymbolObject[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL] =
            outsideSymbolObjectSymbolValue;
        takeInside(outsideSymbolObject, outsideSymbolObjectSymbolValue);

        const outsideArraySymbolValue = 'outsideArray';
        const outsideArray = ['outsideArray'];
        outsideArray[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL] = outsideArraySymbolValue;
        takeInside(outsideArray, outsideArraySymbolValue);

        env.evaluate(`
            const LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL = Symbol.for(
                '@@lockerNearMembraneSerializedValue'
            );

            // Test blue proxies.
            const insideBigIntObjectSymbolValue = 'insideBigIntObject';
            const insideBigIntObject = Object(BigInt(0x1fffffffffffff));
            insideBigIntObject[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL] =
                insideBigIntObjectSymbolValue;
            takeOutside(insideBigIntObject, insideBigIntObjectSymbolValue);

            const insideBooleanTrueObjectSymbolValue = 'insideBooleanTrueObject';
            // eslint-disable-next-line no-new-wrappers
            const insideBooleanTrueObject = new Boolean(true);
            insideBooleanTrueObject[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL] =
                insideBooleanTrueObjectSymbolValue;
            takeOutside(insideBooleanTrueObject, insideBooleanTrueObjectSymbolValue);

            const insideBooleanFalseObjectSymbolValue = 'insideBooleanFalseObject';
            // eslint-disable-next-line no-new-wrappers
            const insideBooleanFalseObject = new Boolean(false);
            insideBooleanFalseObject[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL] =
                insideBooleanFalseObjectSymbolValue;
            takeOutside(insideBooleanFalseObject, insideBooleanFalseObjectSymbolValue);

            const insideNumberObjectSymbolValue = 'insideNumberObject';
            // eslint-disable-next-line no-new-wrappers
            const insideNumberObject = new Number(0);
            insideNumberObject[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL] =
                insideNumberObjectSymbolValue;
            takeOutside(insideNumberObject, insideNumberObjectSymbolValue);

            const insideRegExpLiteralSymbolValue = 'insideRegExpLiteral';
            const insideRegExpLiteral = /insideRegExpLiteral/suy;
            insideRegExpLiteral[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL] =
                insideRegExpLiteralSymbolValue;
            takeOutside(insideRegExpLiteral, insideRegExpLiteralSymbolValue);

            const insideRegExpObjectSymbolValue = 'insideRegExpObject';
            const insideRegExpObject = new RegExp('insideRegExpObject', 'suy');
            insideRegExpObject[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL] =
                insideRegExpObjectSymbolValue;
            takeOutside(insideRegExpObject, insideRegExpObjectSymbolValue);

            const insideStringObjectSymbolValue = 'insideStringObject';
            // eslint-disable-next-line no-new-wrappers
            const insideStringObject = new String('insideString');
            insideStringObject[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL] =
                insideStringObjectSymbolValue;
            takeOutside(insideStringObject, insideStringObjectSymbolValue);

            const insideSymbolObjectSymbolValue = 'insideSymbolObject';
            // eslint-disable-next-line no-new-wrappers
            const insideSymbolObject = Object(Symbol('insideSymbol'));
            insideSymbolObject[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL] =
                insideSymbolObjectSymbolValue;
            takeOutside(insideSymbolObject, insideSymbolObjectSymbolValue);

            const insideArraySymbolValue = 'insideArray';
            const insideArray = ['insideArray'];
            insideArray[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL] = insideArraySymbolValue;
            takeOutside(insideArray, insideArraySymbolValue);
        `);
    });

    it('should not throw proxy invariant violation errors', () => {
        expect.assertions(45);

        let takeInside;
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({
                expect,
                exposeTakeInside(func) {
                    takeInside = func;
                },
                takeOutside(insideValue, expectedSerialized) {
                    // Test blue proxies.
                    // To unlock the near-membrane symbol flag first perform a
                    // has() trap check.
                    expect(LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL in insideValue).toBe(false);
                    // Next, perform a get() trap call.
                    expect(insideValue[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL]).toBe(
                        expectedSerialized
                    );
                    // Performing a get() trap call without first performing a
                    // has() trap check will produce `undefined`.
                    expect(insideValue[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL]).toBe(
                        undefined
                    );
                },
            }),
        });

        env.evaluate(`
            const LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL = Symbol.for(
                '@@lockerNearMembraneSerializedValue'
            );

            exposeTakeInside(function takeInside(outsideValue) {
                // Test red proxies.
                expect(LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL in outsideValue).toBe(false);
                expect(outsideValue[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL]).toBe(undefined);
            });
        `);

        // Test red proxies.
        takeInside(freezeObject(Object(BigInt(0x1fffffffffffff))));
        // eslint-disable-next-line no-new-wrappers
        takeInside(freezeObject(new Boolean(true)));
        // eslint-disable-next-line no-new-wrappers
        takeInside(freezeObject(new Boolean(false)));
        // eslint-disable-next-line no-new-wrappers
        takeInside(freezeObject(new Number(0)));
        // prettier-ignore
        takeInside(freezeObject(/outsideFrozenRegExpLiteral/img));
        // eslint-disable-next-line prefer-regex-literals
        takeInside(new RegExp('outsideFrozenRegExpObject', 'img'));
        // eslint-disable-next-line no-new-wrappers
        takeInside(freezeObject(new String('outsideFrozenStringObject')));
        takeInside(freezeObject(Object(Symbol('outsideFrozenSymbolObject'))));
        takeInside(freezeObject(['outsideFrozenArray']));

        env.evaluate(`
            function freezeObject(object, inheritFrom = Reflect.getPrototypeOf(object)) {
                const frozenProto = Object.create(inheritFrom);
                Object.freeze(frozenProto);
                Reflect.setPrototypeOf(object, frozenProto);
                Object.freeze(object);
                return object;
            }

            // Test blue proxies.
            takeOutside(
                freezeObject(Object(BigInt(0x1fffffffffffff))),
                BigInt(0x1fffffffffffff)
            );
            takeOutside(freezeObject(new Boolean(true)), true);
            takeOutside(freezeObject(new Boolean(false)), false);
            takeOutside(freezeObject(new Number(0)), 0);
            takeOutside(
                freezeObject(/insideFrozenRegExpLiteral/ysu),
                JSON.stringify({
                    flags: 'suy',
                    source: 'insideFrozenRegExpLiteral',
                })
            );
            takeOutside(
                freezeObject(
                    new RegExp('insideFrozenRegExpObject', 'ysu')
                ),
                JSON.stringify({
                    flags: 'suy',
                    source: 'insideFrozenRegExpObject',
                })
            );
            takeOutside(freezeObject(new String('insideFrozenString')), 'insideFrozenString');
            const symbol = Symbol('insideFrozenSymbol');
            takeOutside(freezeObject(Object(symbol)), symbol);
            takeOutside(freezeObject(['insideFrozenArray']), undefined);
        `);
    });
});
