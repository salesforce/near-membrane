import { createMembraneMarshall } from './membrane';

const TypeErrorCtor = TypeError;
const WeakMapCtor = WeakMap;
const { apply: ReflectApply } = Reflect;
const { get: WeakMapProtoGet, set: WeakMapProtoSet } = WeakMapCtor.prototype;

const evaluatorToRedCreateHooksCallbackMap = new WeakMapCtor();
const globalThisToBlueCreateHooksCallbackMap = new WeakMapCtor();

const createMembraneMarshallSourceInStrictMode = `
'use strict';
(${createMembraneMarshall.toString()})`;

export function createBlueConnector(
    globalObjectVirtualizationTarget: WindowProxy & typeof globalThis = window
): ReturnType<typeof createMembraneMarshall> {
    let createHooksCallback = ReflectApply(
        WeakMapProtoGet,
        globalThisToBlueCreateHooksCallbackMap,
        [globalObjectVirtualizationTarget]
    );
    if (createHooksCallback === undefined) {
        createHooksCallback = createMembraneMarshall(globalObjectVirtualizationTarget);
        ReflectApply(WeakMapProtoSet, globalThisToBlueCreateHooksCallbackMap, [
            globalObjectVirtualizationTarget,
            createHooksCallback,
        ]);
    }
    return createHooksCallback;
}

export function createRedConnector(
    evaluator: typeof eval
): ReturnType<typeof createMembraneMarshall> {
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
