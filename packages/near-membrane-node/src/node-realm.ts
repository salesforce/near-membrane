import {
    getFilteredEndowmentDescriptors,
    init,
    initSourceTextInStrictMode,
    ProxyTarget,
    VirtualEnvironment,
    linkIntrinsics,
    SupportFlagsObject,
} from '@locker/near-membrane-base';

import { runInNewContext } from 'vm';

interface EnvironmentOptions {
    distortionCallback?: (originalTarget: ProxyTarget) => ProxyTarget;
    endowments?: object;
    globalThis: typeof globalThis;
    support?: SupportFlagsObject;
}

export default function createVirtualEnvironment(
    options?: EnvironmentOptions
): (sourceText: string) => void {
    const {
        distortionCallback,
        endowments,
        globalThis: blueGlobalThis = globalThis,
        support,
    } = options || {
        __proto__: null,
    };
    const redGlobalThis: typeof globalThis = runInNewContext('globalThis');
    const blueConnector = init;
    const redConnector = redGlobalThis.eval(initSourceTextInStrictMode);
    const endowmentsDescriptors = getFilteredEndowmentDescriptors(
        endowments || { __proto__: null }
    );
    const env = new VirtualEnvironment({
        blueConnector,
        redConnector,
        distortionCallback,
        support,
    });
    env.link('globalThis');
    linkIntrinsics(env, blueGlobalThis);

    // remapping globals
    env.remap(blueGlobalThis, endowmentsDescriptors);

    return (sourceText: string): void => env.evaluate(sourceText);
}
