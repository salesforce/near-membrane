import { createMembraneMarshall } from './membrane';

const TypeErrorCtor = TypeError;
const marshallSourceTextInStrictMode = `(function(){'use strict';return (${createMembraneMarshall.toString()})})()`;
// eslint-disable-next-line no-eval
export function createConnector(evaluator: typeof eval) {
    if (!evaluator) {
        throw new TypeErrorCtor('Missing evaluator function');
    }
    // The result of this eval will be a function that returns a function.
    // The hooks connector is the last returned function, so we invoke the
    // result of the eval operation and return that result.
    return evaluator(marshallSourceTextInStrictMode)();
}
