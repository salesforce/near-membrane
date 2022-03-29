import { createMembraneMarshall } from './membrane';

const TypeErrorCtor = TypeError;
const WeakMapCtor = WeakMap;
const { apply: ReflectApply } = Reflect;
const { get: WeakMapProtoGet, set: WeakMapProtoSet } = WeakMapCtor.prototype;

// istanbul ignore next
const createMembraneMarshallSourceInStrictMode = `
'use strict';
(${createMembraneMarshall.toString()})`;

const evaluatorToCreateHooksCallbackMap = new WeakMapCtor();

// eslint-disable-next-line no-eval
export function createConnector(evaluator: typeof eval): ReturnType<typeof createMembraneMarshall> {
    if (typeof evaluator !== 'function') {
        throw new TypeErrorCtor('Missing evaluator function.');
    }
    let createHooksCallback = ReflectApply(WeakMapProtoGet, evaluatorToCreateHooksCallbackMap, [
        evaluator,
    ]);
    if (createHooksCallback === undefined) {
        createHooksCallback = evaluator(createMembraneMarshallSourceInStrictMode)(true);
        ReflectApply(WeakMapProtoSet, evaluatorToCreateHooksCallbackMap, [
            evaluator,
            createHooksCallback,
        ]);
    }
    return createHooksCallback;
}
