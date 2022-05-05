import {
    assignFilteredGlobalDescriptorsFromPropertyDescriptorMap,
    createBlueConnector,
    createRedConnector,
    DistortionCallback,
    getFilteredGlobalOwnKeys,
    Instrumentation,
    linkIntrinsics,
    PropertyKeys,
    VirtualEnvironment,
} from '@locker/near-membrane-base';

import { runInNewContext } from 'vm';

export interface NodeEnvironmentOptions {
    distortionCallback?: DistortionCallback;
    endowments?: PropertyDescriptorMap;
    globalObjectShape?: object;
    instrumentation?: Instrumentation;
}

let defaultGlobalOwnKeys: PropertyKeys | null = null;

const ObjectCtor = Object;
const { assign: ObjectAssign } = ObjectCtor;
const TypeErrorCtor = TypeError;

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
    const redGlobalObject = runInNewContext('globalThis');
    const env = new VirtualEnvironment({
        blueConnector: createBlueConnector(globalObject),
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
