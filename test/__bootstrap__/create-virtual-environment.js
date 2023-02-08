import { SUPPORTS_SHADOW_REALM } from '@locker/near-membrane-shared';
import createVirtualEnvironment from '@locker/near-membrane-dom';

const useShadowRealm = process.env.USE_SHADOW_REALM;

globalThis.createVirtualEnvironment = function (globalObject, options = {}) {
    if (SUPPORTS_SHADOW_REALM && !('useShadowRealm' in options) && useShadowRealm) {
        options.useShadowRealm = useShadowRealm;
    }
    console.log(options);

    return createVirtualEnvironment(globalObject, options);
};
