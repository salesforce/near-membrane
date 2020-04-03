import { SecureEnvironment } from "./environment";
import { RedProxyTarget, BlueFunction } from "./types";
import { getOwnPropertyDescriptors, construct, ErrorCreate } from "./shared";
import { runInNewContext } from 'vm';

// note: in a node module, the top-level 'this' is not the global object
// (it's *something* but we aren't sure what), however an indirect eval of
// 'this' will be the correct global object.
const unsafeGlobalEvalSrc = `(0, eval)("'use strict'; this")`;

export default function createSecureEnvironment(distortionMap?: Map<RedProxyTarget, RedProxyTarget>): (sourceText: string) => void {
    // Use unsafeGlobalEvalSrc to ensure we get the right 'this'.
    const redGlobalThis = runInNewContext(unsafeGlobalEvalSrc);
    const { eval: redIndirectEval } = redGlobalThis;
    const blueGlobalThis = globalThis as any;
    const blueGlobalThisDescriptors = getOwnPropertyDescriptors(blueGlobalThis);
    const env = new SecureEnvironment({
        blueGlobalThis,
        redGlobalThis,
        distortionMap,
    });

    // remapping globals
    env.remap(redGlobalThis, blueGlobalThis, blueGlobalThisDescriptors);

    return (sourceText: string): void => {
        try {
            redIndirectEval(sourceText);
        } catch (e) {
            // This error occurred when the blue realm attempts to evaluate a
            // sourceText into the sandbox. By throwing a new blue error, which
            // eliminates the stack information from the sandbox as a consequence.
            let blueError;
            const { message, constructor } = e;
            try {
                const blueErrorConstructor = env.getBlueRef(constructor);
                // the constructor must be registered (done during construction of env)
                // otherwise we need to fallback to a regular error.
                blueError = construct(blueErrorConstructor as BlueFunction, [message]);
            } catch {
                // in case the constructor inference fails
                blueError = ErrorCreate(message);
            }
            throw blueError;
        }
    };
}
