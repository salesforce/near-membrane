import createVirtualEnvironment from '@locker/near-membrane-dom';

const LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL = Symbol.for(
    '@@lockerNearMembraneSerializedValue'
);
const LOCKER_NEAR_MEMBRANE_SYMBOL = Symbol.for('@@lockerNearMembrane');

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

        // eslint-disable-next-line no-unused-vars
        let takeInside;

        const endowments = {
            expect,
            exposeTakeInside(func) {
                takeInside = func;
            },
            takeOutside(insideValue) {
                // Test blue proxies.
                // To unlock the near-membrane symbol gate first perform a has()
                // trap check.
                expect(LOCKER_NEAR_MEMBRANE_SYMBOL in insideValue).toBe(false);
                // Next, perform a get() trap call.
                expect(insideValue[LOCKER_NEAR_MEMBRANE_SYMBOL]).toBe(true);
                // Performing a get() trap call without first performing a has()
                // trap check will produce `undefined`.
                expect(insideValue[LOCKER_NEAR_MEMBRANE_SYMBOL]).toBe(undefined);
            },
        };

        const env = createVirtualEnvironment(window, window, { endowments });

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

        // eslint-disable-next-line no-unused-vars
        let takeInside;

        const endowments = {
            expect,
            exposeTakeInside(func) {
                takeInside = func;
            },
            takeOutside(insideValue, expectedSymbolValue) {
                // Test blue proxies.
                expect(LOCKER_NEAR_MEMBRANE_SYMBOL in insideValue).toBe(true);
                expect(insideValue[LOCKER_NEAR_MEMBRANE_SYMBOL]).toBe(expectedSymbolValue);
            },
        };

        const env = createVirtualEnvironment(window, window, { endowments });

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

        // eslint-disable-next-line no-unused-vars
        let takeInside;

        const endowments = {
            expect,
            exposeTakeInside(func) {
                takeInside = func;
            },
            takeOutside(insideValue) {
                // Test blue proxies.
                // To unlock the near-membrane symbol gate first perform a has()
                // trap check.
                expect(LOCKER_NEAR_MEMBRANE_SYMBOL in insideValue).toBe(false);
                // Next, perform a get() trap call.
                expect(insideValue[LOCKER_NEAR_MEMBRANE_SYMBOL]).toBe(true);
                // Performing a get() trap call without first performing a has()
                // trap check will produce `undefined`.
                expect(insideValue[LOCKER_NEAR_MEMBRANE_SYMBOL]).toBe(undefined);
            },
        };

        const env = createVirtualEnvironment(window, window, { endowments });

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

        // eslint-disable-next-line no-unused-vars
        let takeInside;

        const endowments = {
            expect,
            exposeTakeInside(func) {
                takeInside = func;
            },
            takeOutside(insideValue, expectedSerialized) {
                // Test blue proxies.
                // To unlock the near-membrane symbol gate first perform a has()
                // trap check.
                expect(LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL in insideValue).toBe(false);
                // Next, perform a get() trap call.
                expect(insideValue[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL]).toBe(
                    expectedSerialized
                );
                // Performing a get() trap call without first performing a has()
                // trap check will produce `undefined`.
                expect(insideValue[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL]).toBe(undefined);
            },
        };

        const env = createVirtualEnvironment(window, window, { endowments });

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

    it('should not be detectable when customized', () => {
        expect.assertions(36);

        // eslint-disable-next-line no-unused-vars
        let takeInside;

        const endowments = {
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
        };

        const env = createVirtualEnvironment(window, window, { endowments });

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
        const outsideBooleanFalseObject = new Boolean(true);
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
            const insideBooleanFalseObject = new Boolean(true);
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

        // eslint-disable-next-line no-unused-vars
        let takeInside;

        const endowments = {
            expect,
            exposeTakeInside(func) {
                takeInside = func;
            },
            takeOutside(insideValue, expectedSerialized) {
                // Test blue proxies.
                // To unlock the near-membrane symbol gate first perform a has()
                // trap check.
                expect(LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL in insideValue).toBe(false);
                // Next, perform a get() trap call.
                expect(insideValue[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL]).toBe(
                    expectedSerialized
                );
                // Performing a get() trap call without first performing a has()
                // trap check will produce `undefined`.
                expect(insideValue[LOCKER_NEAR_MEMBRANE_SERIALIZED_VALUE_SYMBOL]).toBe(undefined);
            },
        };

        const env = createVirtualEnvironment(window, window, { endowments });

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
