import { SecureEnvironment, SecureProxyTarget } from "./environment";
import { getOwnPropertyDescriptors } from "./shared";

// note: in a node module, the top-level 'this' is not the global object
// (it's *something* but we aren't sure what), however an indirect eval of
// 'this' will be the correct global object.
const unsafeGlobalEvalSrc = `(0, eval)("'use strict'; this")`;

export default function createSecureEnvironment(distortionCallback: (target: SecureProxyTarget) => SecureProxyTarget) {
    // eslint-disable-next-line global-require
    const vm = require('vm');
  
    // Use unsafeGlobalEvalSrc to ensure we get the right 'this'.
    const secureGlobalThis = vm.runInNewContext(unsafeGlobalEvalSrc);
    const rawGlobalThis = globalThis as any;

    const rawGlobalThisDescriptors = getOwnPropertyDescriptors(rawGlobalThis);

    const env = new SecureEnvironment({
        rawGlobalThis,
        secureGlobalThis,
        distortionCallback,
    });

    // remapping globals
    env.remap(secureGlobalThis, rawGlobalThis, rawGlobalThisDescriptors);

    return secureGlobalThis;
}
