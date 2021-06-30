import {
    VirtualEnvironment,
    EnvironmentOptions,
    getFilteredEndowmentDescriptors,
    linkIntrinsics,
    setupStackTrace,
} from '@locker/near-membrane-base';

import { runInNewContext } from 'vm';

// note: in a node module, the top-level 'this' is not the global object
// (it's *something* but we aren't sure what), however an indirect eval of
// 'this' will be the correct global object.
const unsafeGlobalEvalSrc = `(0, eval)("'use strict'; this")`;

export default function createVirtualEnvironment(
    options?: EnvironmentOptions
): (sourceText: string) => void {
    const { distortionCallback, endowments } = options || { __proto__: null };
    // Use unsafeGlobalEvalSrc to ensure we get the right 'this'.
    const redGlobalThis = runInNewContext(unsafeGlobalEvalSrc);
    const endowmentsDescriptors = getFilteredEndowmentDescriptors(
        endowments || { __proto__: null }
    );
    const { eval: redIndirectEval } = redGlobalThis;
    const blueGlobalThis = globalThis as any;
    const env = new VirtualEnvironment({
        blueGlobalThis,
        redGlobalThis,
        distortionCallback,
    });
    setupStackTrace(redGlobalThis);
    linkIntrinsics(env, blueGlobalThis, redGlobalThis);

    // remapping globals
    env.remap(redGlobalThis, blueGlobalThis, endowmentsDescriptors);

    return (sourceText: string): void => {
        try {
            redIndirectEval(sourceText);
        } catch (e) {
            throw env.getBlueValue(e);
        }
    };
}
