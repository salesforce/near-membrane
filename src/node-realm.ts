import { SecureEnvironment } from "./environment";
import { EnvironmentOptions } from "./types";
import { runInNewContext } from 'vm';
import { getFilteredEndowmentDescriptors, linkIntrinsics } from "./intrinsics";

// note: in a node module, the top-level 'this' is not the global object
// (it's *something* but we aren't sure what), however an indirect eval of
// 'this' will be the correct global object.
const unsafeGlobalEvalSrc = `(0, eval)("'use strict'; this")`;

export default function createSecureEnvironment(options?: EnvironmentOptions): (sourceText: string) => void {
    const { distortionMap, endowments } = options || ObjectCreate(null);
    // Use unsafeGlobalEvalSrc to ensure we get the right 'this'.
    const redGlobalThis = runInNewContext(unsafeGlobalEvalSrc);
    const endowmentsDescriptors = getFilteredEndowmentDescriptors(endowments || ObjectCreate(null));
    const { eval: redIndirectEval } = redGlobalThis;
    const blueGlobalThis = globalThis as any;
    const env = new SecureEnvironment({
        blueGlobalThis,
        redGlobalThis,
        distortionMap,
    });
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
