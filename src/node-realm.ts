import { SecureEnvironment } from "./environment";
import { SecureProxyTarget } from "./membrane";
import { getOwnPropertyDescriptors, construct, ErrorCreate } from "./shared";
import { createContext, runInContext } from 'vm';

// note: in a node module, the top-level 'this' is not the global object
// (it's *something* but we aren't sure what), however an indirect eval of
// 'this' will be the correct global object.
const unsafeGlobalEvalSrc = `(0, eval)("'use strict'; this")`;

export default function createSecureEnvironment(distortionMap?: Map<SecureProxyTarget, SecureProxyTarget>): (sourceText: string) => void {
    // Use unsafeGlobalEvalSrc to ensure we get the right 'this'.
    const context = createContext();
    const secureGlobalThis = runInContext(unsafeGlobalEvalSrc, context);
    const { eval: secureIndirectEval } = secureGlobalThis;
    const rawGlobalThis = globalThis as any;
    const rawGlobalThisDescriptors = getOwnPropertyDescriptors(rawGlobalThis);
    const env = new SecureEnvironment({
        rawGlobalThis,
        secureGlobalThis,
        distortionMap,
    });

    // remapping globals
    env.remap(secureGlobalThis, rawGlobalThis, rawGlobalThisDescriptors);

    return (sourceText: string): void => {
        try {
            secureIndirectEval(sourceText);
        } catch (e) {
            // This error occurred when the outer realm attempts to evaluate a
            // sourceText into the sandbox. By throwing a new raw error, which
            // eliminates the stack information from the sandbox as a consequence.
            let rawError;
            const { message, constructor } = e;
            try {
                rawError = construct(env.getRawRef(constructor), [message]);
            } catch (ignored) {
                // in case the constructor inference fails
                rawError = ErrorCreate(message);
            }
            throw rawError;
        }
    };
}
