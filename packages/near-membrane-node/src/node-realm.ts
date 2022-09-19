import {
    assignFilteredGlobalDescriptorsFromPropertyDescriptorMap,
    createBlueConnector,
    createRedConnector,
    getFilteredGlobalOwnKeys,
    linkIntrinsics,
    VirtualEnvironment,
} from '@locker/near-membrane-base';
import {
    ObjectAssign,
    toSafeWeakMap,
    TypeErrorCtor,
    WeakMapCtor,
} from '@locker/near-membrane-shared';
import type { Connector } from '@locker/near-membrane-base/types';
import { runInNewContext } from 'node:vm';
import type { NodeEnvironmentOptions } from './types';

const globalObjectToBlueCreateHooksCallbackMap = toSafeWeakMap(
    new WeakMapCtor<typeof globalThis, Connector>()
);

let defaultGlobalOwnKeys: PropertyKey[] | null = null;

export default function createVirtualEnvironment(
    globalObject: typeof globalThis,
    options?: NodeEnvironmentOptions
): VirtualEnvironment {
    if (typeof globalObject !== 'object' || globalObject === null) {
        throw new TypeErrorCtor('Missing global object virtualization target.');
    }
    const {
        distortionCallback,
        endowments,
        globalObjectShape,
        instrumentation,
        liveTargetCallback,
    } = ObjectAssign({ __proto__: null }, options) as NodeEnvironmentOptions;
    let blueConnector = globalObjectToBlueCreateHooksCallbackMap.get(globalObject) as
        | Connector
        | undefined;
    if (blueConnector === undefined) {
        blueConnector = createBlueConnector(globalObject);
        globalObjectToBlueCreateHooksCallbackMap.set(globalObject, blueConnector);
    }
    const redGlobalObject = runInNewContext('globalThis');
    const env = new VirtualEnvironment({
        blueConnector,
        distortionCallback,
        instrumentation,
        liveTargetCallback,
        redConnector: createRedConnector(redGlobalObject.eval),
    });
    linkIntrinsics(env, globalObject);

    const shouldUseDefaultGlobalOwnKeys =
        typeof globalObjectShape !== 'object' || globalObjectShape === null;
    if (shouldUseDefaultGlobalOwnKeys && defaultGlobalOwnKeys === null) {
        defaultGlobalOwnKeys = getFilteredGlobalOwnKeys(redGlobalObject);
    }

    env.lazyRemapProperties(
        globalObject,
        shouldUseDefaultGlobalOwnKeys
            ? (defaultGlobalOwnKeys as PropertyKey[])
            : getFilteredGlobalOwnKeys(globalObjectShape)
    );

    if (endowments) {
        const filteredEndowments = {};
        assignFilteredGlobalDescriptorsFromPropertyDescriptorMap(filteredEndowments, endowments);
        env.remapProperties(globalObject, filteredEndowments);
    }
    return env;
}
