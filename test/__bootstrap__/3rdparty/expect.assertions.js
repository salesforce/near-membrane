'use strict';

// Based on jasmine-expect-count.
// Copyright (c) 2017 Tony Brix. Released under MIT license:
// https://github.com/UziTech/jasmine-expect-count

// eslint-disable-next-line no-unused-labels, no-labels
EXPECT_PATCHING_SCOPE: {
    if (!globalThis.jasmine) {
        throw new Error('jasmine must be loaded before patching in expect.assertions(x)');
    }

    let actualExpects = 0;
    let expectedExpects = null;
    const { expect: originalExpect } = globalThis;

    globalThis.expect = function (...args) {
        actualExpects++;
        return Reflect.apply(originalExpect, this, args);
    };

    globalThis.expect.assertions = (count) => {
        const num = Number.parseInt(count, 10);
        if (!Number.isSafeInteger(num)) {
            throw new Error(
                'expect.assertions(count) expects count to be a number >= 0 as the first argument.'
            );
        }
        expectedExpects = num;
    };

    const checkExpectCount = () => {
        if (expectedExpects !== null && actualExpects !== expectedExpects) {
            throw new Error(
                `Expected ${expectedExpects} expect${
                    expectedExpects !== 1 ? 's' : ''
                } to be called, ${actualExpects} expect${
                    actualExpects !== 1 ? 's were' : ' was'
                } actually called.`
            );
        }
    };

    beforeEach(() => {
        actualExpects = 0;
        expectedExpects = null;
    });

    afterEach(checkExpectCount);
}
