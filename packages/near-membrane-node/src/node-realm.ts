import {
    getFilteredEndowmentDescriptors,
    init,
    initSourceTextInStrictMode,
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

export default function createVirtualEnvironment(
    providedOptions: NodeEnvironmentOptions
): (sourceText: string) => void {
    const options = {
        __proto__: null,
        globalThis,
        ...providedOptions,
    };
    const { distortionCallback, endowments = {}, globalThis: blueGlobalThis, support } = options;
    const redGlobalThis: typeof globalThis = runInNewContext('globalThis');
    const blueConnector = init;
    const redConnector = redGlobalThis.eval(initSourceTextInStrictMode);
    const endowmentsDescriptors = getFilteredEndowmentDescriptors(endowments);
    const env = new VirtualEnvironment({
        blueConnector,
        distortionCallback,
        redConnector,
        support,
    });
    env.link('globalThis');
    linkIntrinsics(env, blueGlobalThis);
    // remapping globals
    env.remap(blueGlobalThis, endowmentsDescriptors);
    return (sourceText: string): void => env.evaluate(sourceText);
}
