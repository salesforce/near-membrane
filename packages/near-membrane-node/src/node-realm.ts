import {
    init,
    VirtualEnvironment,
    getFilteredEndowmentDescriptors,
    ProxyTarget,
} from '@locker/near-membrane-base';

import { runInNewContext } from 'vm';

interface EnvironmentOptions {
    distortionCallback?: (originalTarget: ProxyTarget) => ProxyTarget;
    endowments?: object;
    globalThis: typeof globalThis;
}

// note: in a node module, the top-level 'this' is not the global object
// (it's *something* but we aren't sure what), however an indirect eval of
// 'this' will be the correct global object.
const unsafeGlobalEvalSrc = `(0, eval)("'use strict'; this")`;
// TODO: how to guarantee that the function is actually running in strict mode?
const initSourceText = `(function(){'use strict';return (${init.toString()})})()`;

export default function createVirtualEnvironment(
    options?: EnvironmentOptions
): (sourceText: string) => void {
    const { distortionCallback, endowments, globalThis: blueGlobalThis = globalThis } = options || {
        __proto__: null,
    };
    // Use unsafeGlobalEvalSrc to ensure we get the right 'this'.
    const redGlobalThis: typeof globalThis = runInNewContext(unsafeGlobalEvalSrc);
    const blueConnector = init;
    const redConnector = redGlobalThis.eval(initSourceText);
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
