import createVirtualEnvironment from '@locker/near-membrane-dom';

const distortionMap = new Map([
    [
        alert,
        () => {
            console.error('forbidden');
        },
    ],
]);

function distortionCallback(v) {
    return distortionMap.get(v) || v;
}

globalThis.bar = { a: 1, b: 2 };
Object.freeze(globalThis.bar);

const evalScript = createVirtualEnvironment(window, { distortionCallback });

try {
    evalScript(`
        return; // illegal return statement
    `);
} catch (e) {
    // testing syntax error when evaluating
    if (!(e instanceof SyntaxError)) {
        console.error(e);
    }
}

try {
    evalScript(`
        throw new Error('test');
    `);
} catch (e) {
    // testing initialization error when evaluating
    if (!(e instanceof Error)) {
        console.error(e);
    }
}

// verifying that in deep it is reflected as frozen
evalScript(`
    'use strict';
    try {
        bar.c = 3; // because it is frozen
    } catch (e) {
        e instanceof TypeError;
    }
    bar.c === undefined;
`);

evalScript(`
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
