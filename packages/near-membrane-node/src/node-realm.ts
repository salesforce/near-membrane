import {
    createConnector,
    createMembraneMarshall,
    getResolvedShapeDescriptors,
    linkIntrinsics,
    DistortionCallback,
    SupportFlagsObject,
    validateRequiredGlobalShapeAndVirtualizationObjects,
    VirtualEnvironment,
} from '@locker/near-membrane-base';

import { runInNewContext } from 'vm';

interface NodeEnvironmentOptions {
    distortionCallback?: DistortionCallback;
    endowments?: object;
    support?: SupportFlagsObject;
}

const createHooksCallback = createMembraneMarshall();

export default function createVirtualEnvironment(
    globalObjectShape: object,
    globalObjectVirtualizationTarget: WindowProxy & typeof globalThis,
    providedOptions: NodeEnvironmentOptions
): VirtualEnvironment {
    validateRequiredGlobalShapeAndVirtualizationObjects(
        globalObjectShape,
        globalObjectVirtualizationTarget
    );
    const options = {
        __proto__: null,
        ...providedOptions,
    };
    const { distortionCallback, endowments = {}, support } = options;
    const redGlobalThis: typeof globalThis = runInNewContext('globalThis');
    const blueConnector = createHooksCallback;
    const redConnector = createConnector(redGlobalThis.eval);
    const env = new VirtualEnvironment({
        blueConnector,
        distortionCallback,
        redConnector,
        support,
    });
    env.link('globalThis');
    linkIntrinsics(env, globalObjectVirtualizationTarget);
    // remapping globals
    env.remap(
        globalObjectVirtualizationTarget,
        getResolvedShapeDescriptors(globalObjectShape, endowments)
    );
    return env;
}
