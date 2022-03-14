import {
    assignFilteredGlobalDescriptorsFromPropertyDescriptorMap,
    createConnector,
    createMembraneMarshall,
    getFilteredGlobalOwnKeys,
    linkIntrinsics,
    DistortionCallback,
    InstrumentationHooks,
    VirtualEnvironment,
} from '@locker/near-membrane-base';

import { runInNewContext } from 'vm';

interface NodeEnvironmentOptions {
    distortionCallback?: DistortionCallback;
    endowments?: PropertyDescriptorMap;
    instrumentation?: InstrumentationHooks;
}

const TypeErrorCtor = TypeError;
const createHooksCallback = createMembraneMarshall();

export default function createVirtualEnvironment(
    globalObjectShape: object,
    globalObjectVirtualizationTarget: WindowProxy & typeof globalThis,
    providedOptions: NodeEnvironmentOptions
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
    // prettier-ignore
    const {
        distortionCallback,
        endowments,
        instrumentation,
    } = {
        // @ts-ignore: TS doesn't like __proto__ on NodeEnvironmentOptions.
        __proto__: null,
        ...providedOptions,
    };
    const globalOwnKeys = getFilteredGlobalOwnKeys(globalObjectShape);
    const redGlobalThis: typeof globalThis = runInNewContext('globalThis');
    const blueConnector = createHooksCallback;
    const redConnector = createConnector(redGlobalThis.eval);
    const env = new VirtualEnvironment({
        blueConnector,
        distortionCallback,
        redConnector,
        instrumentation,
    });
    linkIntrinsics(env, globalObjectVirtualizationTarget);
    env.lazyRemap(globalObjectVirtualizationTarget, globalOwnKeys);
    if (endowments) {
        const filteredEndowments = {};
        assignFilteredGlobalDescriptorsFromPropertyDescriptorMap(filteredEndowments, endowments);
        env.remap(globalObjectVirtualizationTarget, filteredEndowments);
    }
    return env;
}
