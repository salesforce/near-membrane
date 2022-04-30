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

export interface NodeEnvironmentOptions {
    distortionCallback?: DistortionCallback;
    endowments?: PropertyDescriptorMap;
    instrumentation?: Instrumentation;
}

const TypeErrorCtor = TypeError;

export default function createVirtualEnvironment(
    globalObject: WindowProxy & typeof globalThis,
    globalObjectShape: object,
    options: NodeEnvironmentOptions
): VirtualEnvironment {
    if (typeof globalObject !== 'object' || globalObject === null) {
        throw new TypeErrorCtor('Missing global object virtualization target.');
    }
    if (typeof globalObjectShape !== 'object' || globalObjectShape === null) {
        throw new TypeErrorCtor('Missing global object shape.');
    }
    const { distortionCallback, endowments, instrumentation } = {
        __proto__: null,
        ...options,
    } as NodeEnvironmentOptions;
    const env = new VirtualEnvironment({
        blueConnector: createBlueConnector(globalObject),
        distortionCallback,
        instrumentation,
        redConnector: createRedConnector(runInNewContext('globalThis').eval),
    });
    linkIntrinsics(env, globalObject);
    env.lazyRemapProperties(globalObject, getFilteredGlobalOwnKeys(globalObjectShape));
    if (endowments) {
        const filteredEndowments = {};
        assignFilteredGlobalDescriptorsFromPropertyDescriptorMap(filteredEndowments, endowments);
        env.remapProperties(globalObject, filteredEndowments);
    }
    return env;
}
