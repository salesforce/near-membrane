// Based on jasmine-expect-count.
// Copyright (c) 2017 Tony Brix. Released under MIT license:
// https://github.com/UziTech/jasmine-expect-count

EXPECT_PATCHING_SCOPE: {
    if (!globalThis.jasmine) {
        throw new Error("jasmine must be loaded before patching in expect.assertions(x)");
    }

    let actualExpects = 0;
    let expectedExpects = null;

    beforeEach(() => {
        actualExpects = 0;
        expectedExpects = null;
    });

    const { expect: originalExpect } = globalThis;

    globalThis.expect = function(...args) {
        actualExpects++;
        return Reflect.apply(originalExpect, this, args)
    };

    globalThis.expect.assertions = (num) => {
        num = Number.parseInt(num);
        if (!Number.isSafeInteger(num)) {
            throw new Error("jasmine.expectCount expects a number >= 0 as the first argument.");
        }
        expectedExpects = num;
    };

    const checkExpectCount = () => {
        if (expectedExpects !== null && actualExpects !== expectedExpects) {
            throw `Expected ${expectedExpects} expect${expectedExpects !== 1 ? "s" : ""} to be called, ${actualExpects} expect${actualExpects !== 1 ? "s were" : " was"} actually called.`;
        }
    };

    afterEach(checkExpectCount);
};
