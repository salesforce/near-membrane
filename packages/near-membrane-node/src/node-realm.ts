import {
    assignFilteredGlobalDescriptorsFromPropertyDescriptorMap,
    Connector,
    createBlueConnector,
    createRedConnector,
    DistortionCallback,
    getFilteredGlobalOwnKeys,
    Instrumentation,
    linkIntrinsics,
    PropertyKeys,
    toSafeWeakMap,
    VirtualEnvironment,
} from '@locker/near-membrane-base';

import { runInNewContext } from 'vm';

export interface NodeEnvironmentOptions {
    distortionCallback?: DistortionCallback;
    endowments?: PropertyDescriptorMap;
    globalObjectShape?: object;
    instrumentation?: Instrumentation;
}

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
