import { createMembraneMarshall } from './membrane';

export type Connector = ReturnType<typeof createMembraneMarshall>;

const TypeErrorCtor = TypeError;
const WeakMapCtor = WeakMap;
const { apply: ReflectApply } = Reflect;
const { get: WeakMapProtoGet, set: WeakMapProtoSet } = WeakMapCtor.prototype;

const evaluatorToRedCreateHooksCallbackMap: WeakMap<typeof eval, Connector> = new WeakMapCtor();

const globalThisToBlueCreateHooksCallbackMap: WeakMap<typeof globalThis, Connector> =
    new WeakMapCtor();

const createMembraneMarshallSourceInStrictMode = `
'use strict';
(${createMembraneMarshall})`;

export function createBlueConnector(globalObject: typeof globalThis): Connector {
    if (typeof globalObject !== 'object' || globalObject === null) {
        throw new TypeErrorCtor('Missing globalObject.');
    }
    let createHooksCallback = ReflectApply(
        WeakMapProtoGet,
        globalThisToBlueCreateHooksCallbackMap,
        [globalObject]
    );
    if (createHooksCallback === undefined) {
        createHooksCallback = createMembraneMarshall(globalObject);
        ReflectApply(WeakMapProtoSet, globalThisToBlueCreateHooksCallbackMap, [
            globalObject,
            createHooksCallback,
        ]);
    }
    return createHooksCallback;
}

export function createRedConnector(evaluator: typeof eval): Connector {
    if (typeof evaluator !== 'function') {
        throw new TypeErrorCtor('Missing evaluator function.');
    }
    let createHooksCallback = ReflectApply(WeakMapProtoGet, evaluatorToRedCreateHooksCallbackMap, [
        evaluator,
    ]);
    if (createHooksCallback === undefined) {
        createHooksCallback = evaluator(createMembraneMarshallSourceInStrictMode)();
        ReflectApply(WeakMapProtoSet, evaluatorToRedCreateHooksCallbackMap, [
            evaluator,
            createHooksCallback,
        ]);
    }
    return createHooksCallback;
}
