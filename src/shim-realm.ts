import '../node_modules/realms-shim/dist/realms-shim.umd.js';
import { SecureEnvironment } from "./environment";
import { getOwnPropertyDescriptors, getGlobalThis } from "./shared";
import { SecureProxyTarget } from './environment.js';

export default function createSecureEnvironment(distortionCallback: (target: SecureProxyTarget) => SecureProxyTarget) {
    const globalThis = getGlobalThis();
    const secureGlobalThis = globalThis.Realm.makeRootRealm().global;
    const rawGlobalThis = globalThis;

    const rawGlobalThisDescriptors = getOwnPropertyDescriptors(rawGlobalThis);

    const env = new SecureEnvironment({
        secureGlobalThis,
        distortionCallback,
    });

    // remapping globals
    env.remap(secureGlobalThis, rawGlobalThis, rawGlobalThisDescriptors);

    return secureGlobalThis;
}
