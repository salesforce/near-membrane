import createVirtualEnvironment from '@locker/near-membrane-dom';

const distortionMap = new Map([
    [alert, () => {
        console.error('forbidden');
    }],
]);

globalThis.bar = { a: 1, b: 2 };
Object.freeze(globalThis.bar)

const env = createVirtualEnvironment({
    distortionMap,
    endowments: window
});

try {
    env.evaluate(`
        return; // illegal return statement
    `);
} catch (e) {
    // testing syntax error when evaluating
    e instanceof SyntaxError;
}

try {
    env.evaluate(`
        throw new Error('test');
    `);
} catch (e) {
    // testing initialization error when evaluating
    e instanceof Error;
}

// verifying that in deep it is reflected as frozen
env.evaluate(`
    'use strict';
    try {
        bar.c = 3; // because it is frozen
    } catch (e) {
        e instanceof TypeError;
    }
    bar.c === undefined;
`);


env.evaluate(`
    'use strict';
    function getLimit (depth = 1) {
        try {
            return getLimit(depth + 1)
        } catch (err) {
            return depth
        }
    }
    const limit = getLimit();
    console.log(limit)

    let err

    function exhaust(depth, cb) {
        try {
            if (depth > 0) {
                exhaust(depth - 1, cb)
            } else {
                cb('something')
            }
        } catch (_err) {
            err =_err
        }
    }


    // exhausting the engine by calling a function from the sandbox
    exhaust(limit - 1, function () {})

    console.log('Sandboxed fn (throw?/sandboxed?): ', err !== undefined, err instanceof Error, err + '')

    // exhausting the engine by calling a function from the sandbox
    exhaust(limit - 1, console.log)
    console.log('Outer fn (throw?/sandboxed?)', err !== undefined, err instanceof Error, err + '', err.stack + '')
`);
