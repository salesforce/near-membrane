import {
    assignFilteredGlobalDescriptorsFromPropertyDescriptorMap,
    createBlueConnector,
    createRedConnector,
    getFilteredGlobalOwnKeys,
    linkIntrinsics,
    toSafeWeakMap,
    VirtualEnvironment,
} from '@locker/near-membrane-base';
import type { Connector, PropertyKeys } from '@locker/near-membrane-base/types';
import { runInNewContext } from 'vm';
import type { NodeEnvironmentOptions } from './types';

const ObjectCtor = Object;
const { assign: ObjectAssign } = ObjectCtor;
const TypeErrorCtor = TypeError;
const WeakMapCtor = WeakMap;

const globalObjectToBlueCreateHooksCallbackMap = toSafeWeakMap(
    new WeakMapCtor<typeof globalThis, Connector>()
);

let defaultGlobalOwnKeys: PropertyKeys | null = null;

export default function createVirtualEnvironment(
    globalObject: typeof globalThis,
    options?: NodeEnvironmentOptions
): VirtualEnvironment {
    if (typeof globalObject !== 'object' || globalObject === null) {
        throw new TypeErrorCtor('Missing global object virtualization target.');
    }
    const { distortionCallback, endowments, globalObjectShape, instrumentation } = ObjectAssign(
        { __proto__: null },
        options
    ) as NodeEnvironmentOptions;
    let blueConnector = globalObjectToBlueCreateHooksCallbackMap.get(globalObject) as
        | Connector
        | undefined;
    if (blueConnector === undefined) {
        blueConnector = createBlueConnector(globalObject);
        globalObjectToBlueCreateHooksCallbackMap.set(globalObject, blueConnector);
    }
    const redGlobalObject = runInNewContext('globalThis');
    const env = new VirtualEnvironment({
        blueConnector,
        distortionCallback,
        instrumentation,
        redConnector: createRedConnector(redGlobalObject.eval),
    });
    linkIntrinsics(env, globalObject);

    const shouldUseDefaultGlobalOwnKeys =
        typeof globalObjectShape !== 'object' || globalObjectShape === null;
    if (shouldUseDefaultGlobalOwnKeys && defaultGlobalOwnKeys === null) {
        defaultGlobalOwnKeys = getFilteredGlobalOwnKeys(redGlobalObject);
    }

    env.lazyRemapProperties(
        globalObject,
        shouldUseDefaultGlobalOwnKeys
            ? (defaultGlobalOwnKeys as PropertyKeys)
            : getFilteredGlobalOwnKeys(globalObjectShape)
    );

    if (endowments) {
        const filteredEndowments = {};
        assignFilteredGlobalDescriptorsFromPropertyDescriptorMap(filteredEndowments, endowments);
        env.remapProperties(globalObject, filteredEndowments);
    }
    return env;
}
