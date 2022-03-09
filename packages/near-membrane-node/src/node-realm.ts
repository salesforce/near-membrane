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
    const globalObjectShapeWithEndowments = {};
    assignFilteredGlobalDescriptors(globalObjectShapeWithEndowments, globalObjectShape);
    assignFilteredGlobalDescriptorsFromPropertyDescriptorMap(
        globalObjectShapeWithEndowments,
        endowments
    );
    env.remap(globalObjectVirtualizationTarget, globalObjectShapeWithEndowments);
    return env;
}
