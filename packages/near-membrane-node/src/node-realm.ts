import {
    getResolvedShapeDescriptors,
    createMembraneMarshall,
    marshallSourceTextInStrictMode,
    linkIntrinsics,
    DistortionCallback,
    SupportFlagsObject,
    VirtualEnvironment,
} from '@locker/near-membrane-base';

import { runInNewContext } from 'vm';

interface NodeEnvironmentOptions {
    distortionCallback?: DistortionCallback;
    endowments?: object;
    globalThis?: typeof globalThis;
    support?: SupportFlagsObject;
}

const createHooksCallback = createMembraneMarshall();

export default function createVirtualEnvironment(
    globalObjectShape: object,
    providedOptions: NodeEnvironmentOptions
): VirtualEnvironment {
    const options = {
        __proto__: null,
        globalThis,
        ...providedOptions,
    };
    const { distortionCallback, endowments = {}, globalThis: blueGlobalThis, support } = options;
    const redGlobalThis: typeof globalThis = runInNewContext('globalThis');
    const blueConnector = createHooksCallback;
    const redConnector = redGlobalThis.eval(marshallSourceTextInStrictMode)();
    const env = new VirtualEnvironment({
        blueConnector,
        distortionCallback,
        redConnector,
        support,
    });
    env.link('globalThis');
    linkIntrinsics(env, blueGlobalThis);
    // remapping globals
    env.remap(blueGlobalThis, getResolvedShapeDescriptors(globalObjectShape, endowments));
    return env;
}
