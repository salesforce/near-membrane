import {
    assignFilteredGlobalDescriptors,
    assignFilteredGlobalDescriptorsFromPropertyDescriptorMap,
    createConnector,
    createMembraneMarshall,
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
    const options = {
        __proto__: null,
        ...providedOptions,
    };
    const { distortionCallback, endowments, instrumentation } = options;
    const redGlobalThis: typeof globalThis = runInNewContext('globalThis');
    const blueConnector = createHooksCallback;
    const redConnector = createConnector(redGlobalThis.eval);
    const env = new VirtualEnvironment({
        blueConnector,
        distortionCallback,
        redConnector,
        instrumentation,
    });
    env.link('globalThis');
    linkIntrinsics(env, globalObjectVirtualizationTarget);
    const globalObjectShapeWithEndowments = {};
    assignFilteredGlobalDescriptors(globalObjectShapeWithEndowments, globalObjectShape);
    assignFilteredGlobalDescriptorsFromPropertyDescriptorMap(
        globalObjectShapeWithEndowments,
        endowments
    );
    // remapping globals
    env.remap(globalObjectVirtualizationTarget, globalObjectShapeWithEndowments);
    return env;
}
