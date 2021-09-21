import {
    getFilteredEndowmentDescriptors,
    init,
    initSourceTextInStrictMode,
    ProxyTarget,
    VirtualEnvironment,
} from '@locker/near-membrane-base';

import { runInNewContext } from 'vm';

interface EnvironmentOptions {
    distortionCallback?: (originalTarget: ProxyTarget) => ProxyTarget;
    endowments?: object;
    globalThis: typeof globalThis;
}

export default function createVirtualEnvironment(
    options?: EnvironmentOptions
): (sourceText: string) => void {
    const { distortionCallback, endowments, globalThis: blueGlobalThis = globalThis } = options || {
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
    });

    // remapping globals
    env.remap(blueGlobalThis, endowmentsDescriptors);

    return (sourceText: string): void => env.evaluate(sourceText);
}
