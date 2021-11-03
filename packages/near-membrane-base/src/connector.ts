import { createMembraneMarshall } from './membrane';

const TypeErrorCtor = TypeError;
// istanbul ignore next
const marshallSourceTextInStrictMode = `
(function(){
    'use strict';
    (${function initializeShadowRealm() {
        if (typeof Error.stackTraceLimit === 'number') {
            // The default stack trace limit is 10.
            // Increasing to 20 as a baby step.
            Error.stackTraceLimit *= 2;
        }
    }.toString()})();
    return (${createMembraneMarshall.toString()})
})()`;
// eslint-disable-next-line no-eval
export function createConnector(evaluator: typeof eval) {
    if (typeof evaluator !== 'function') {
        throw new TypeErrorCtor('Missing evaluator function.');
    }
    // The result of this eval will be a function that returns a function.
    // The hooks connector is the last returned function, so we invoke the
    // result of the eval operation and return that result.
    return evaluator(marshallSourceTextInStrictMode)();
}
