import {
    assignFilteredGlobalDescriptorsFromPropertyDescriptorMap,
    createBlueConnector,
    createRedConnector,
    getFilteredGlobalOwnKeys,
    linkIntrinsics,
    DistortionCallback,
    Instrumentation,
    VirtualEnvironment,
} from '@locker/near-membrane-base';

import { runInNewContext } from 'vm';

interface NodeEnvironmentOptions {
    distortionCallback?: DistortionCallback;
    endowments?: PropertyDescriptorMap;
    instrumentation?: Instrumentation;
}

const TypeErrorCtor = TypeError;

export default function createVirtualEnvironment(
    globalObjectShape: object,
    globalObjectVirtualizationTarget: WindowProxy & typeof globalThis,
    options: NodeEnvironmentOptions
): VirtualEnvironment {
    if (typeof globalObjectShape !== 'object' || globalObjectShape === null) {
        throw new TypeErrorCtor('Missing global object shape.');
    }
    if (
        typeof globalObjectVirtualizationTarget !== 'object' ||
        globalObjectVirtualizationTarget === null
    ) {
        throw new TypeErrorCtor('Missing global object virtualization target.');
    }
    const { distortionCallback, endowments, instrumentation } = {
        __proto__: null,
        ...options,
    } as NodeEnvironmentOptions;
    const env = new VirtualEnvironment({
        blueConnector: createBlueConnector(globalObjectVirtualizationTarget),
        distortionCallback,
        instrumentation,
        redConnector: createRedConnector(runInNewContext('globalThis').eval),
    });
    linkIntrinsics(env, globalObjectVirtualizationTarget);
    env.lazyRemapProperties(
        globalObjectVirtualizationTarget,
        getFilteredGlobalOwnKeys(globalObjectShape)
    );
    if (endowments) {
        const filteredEndowments = {};
        assignFilteredGlobalDescriptorsFromPropertyDescriptorMap(filteredEndowments, endowments);
        env.remapProperties(globalObjectVirtualizationTarget, filteredEndowments);
    }
    return env;
}
