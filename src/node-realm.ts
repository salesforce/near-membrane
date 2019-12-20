import { SecureEnvironment } from "./environment";
import { SecureProxyTarget } from "./membrane";
import { getOwnPropertyDescriptors } from "./shared";
import { runInNewContext } from 'vm';

// note: in a node module, the top-level 'this' is not the global object
// (it's *something* but we aren't sure what), however an indirect eval of
// 'this' will be the correct global object.
const unsafeGlobalEvalSrc = `(0, eval)("'use strict'; this")`;

export default function createSecureEnvironment(distortionMap?: Map<SecureProxyTarget, SecureProxyTarget>): typeof globalThis {
    // Use unsafeGlobalEvalSrc to ensure we get the right 'this'.
    const secureGlobalThis = runInNewContext(unsafeGlobalEvalSrc);
    const rawGlobalThis = globalThis as any;
    const rawGlobalThisDescriptors = getOwnPropertyDescriptors(rawGlobalThis);
    const env = new SecureEnvironment({
        rawGlobalThis,
        secureGlobalThis,
        distortionMap,
    });

    // remapping globals
    env.remap(secureGlobalThis, rawGlobalThis, rawGlobalThisDescriptors);

    return secureGlobalThis;
}
