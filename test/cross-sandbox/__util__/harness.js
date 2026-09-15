import createVirtualEnvironment from '@locker/near-membrane-dom';

/**
 * Cross-sandbox (double membrane) test harness.
 *
 * Existing near-membrane karma coverage exercises a SINGLE membrane crossing:
 * a blue realm (system mode / host `window`) talking to one red realm (sandbox)
 * created by `createVirtualEnvironment(window, ...)`.
 *
 * These helpers stand up TWO independent sandboxes (red-A, red-B) on the same
 * blue realm. There is no direct A<->B membrane: an object minted in A that
 * reaches B unwraps at A's membrane back to the blue target, then B re-wraps it,
 * so B observes `redB_proxy( blue( redA_object ) )` -- the red-A -> blue -> red-B
 * double crossing. `ops(env)` lifts generic operations into a realm and hands the
 * callable back to blue, which is how one sandbox operates on another's object
 * purely through the membranes.
 */

// Two sandboxes on the same blue realm.
export function makeSandboxes(optionsA = {}, optionsB = {}) {
    return {
        a: createVirtualEnvironment(window, optionsA),
        b: createVirtualEnvironment(window, optionsB),
    };
}

// A sandbox created with a whole specialized API endowed into it. `api` is a
// plain object of names -> values; every entry is installed as a global inside
// the red realm. This is how a foreign object (e.g. one minted in sandbox A) or
// a capture callback is injected so in-sandbox code can read naturally, mirroring
// how LWS wires namespace objects/APIs into a sandbox.
export function sandbox(api = {}, options = {}) {
    return createVirtualEnvironment(window, {
        ...options,
        endowments: Object.getOwnPropertyDescriptors(api),
    });
}

// Collects values handed back out of a sandbox. Endow `hook` as an API method;
// values pushed from inside the sandbox surface in `values` on the blue side.
export function capture() {
    const values = [];
    return {
        hook(value) {
            values.push(value);
            return value;
        },
        values,
        get last() {
            return values[values.length - 1];
        },
    };
}

// Generic operations, evaluated INSIDE `env` and returned to blue as callables.
// Passing a foreign object into one of these forces it across `env`'s membrane.
export function ops(env) {
    return {
        // read `o[k]` from within env
        read: env.evaluate('(o, k) => o[k]'),
        // write `o[k] = v` from within env; return env's post-write view
        write: env.evaluate('(o, k, v) => { o[k] = v; return o[k]; }'),
        // define a property on `o` from within env
        define: env.evaluate('(o, k, desc) => { Object.defineProperty(o, k, desc); return o[k]; }'),
        // `k in o` from within env
        has: env.evaluate('(o, k) => k in o'),
        // own-descriptor of `o[k]` as seen from within env
        descriptor: env.evaluate('(o, k) => Object.getOwnPropertyDescriptor(o, k)'),
    };
}

// Mint an object in `env` from a source expression, returned to blue.
export function mint(env, sourceExpression) {
    return env.evaluate(`(${sourceExpression})`);
}
