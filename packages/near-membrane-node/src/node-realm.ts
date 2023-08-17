import { runInNewContext } from 'node:vm';
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
import type { Connector } from '@locker/near-membrane-base';
import type { NodeEnvironmentOptions } from './types';

const blueCreateHooksCallbackCache = toSafeWeakMap(new WeakMapCtor<typeof globalThis, Connector>());

let defaultGlobalOwnKeys: PropertyKey[] | null = null;

export default function createVirtualEnvironment(
    globalObject: typeof globalThis,
    providedOptions?: NodeEnvironmentOptions
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
        signSourceCallback,
    } = ObjectAssign({ __proto__: null }, providedOptions) as NodeEnvironmentOptions;
    let blueConnector = blueCreateHooksCallbackCache.get(globalObject) as Connector | undefined;
    if (blueConnector === undefined) {
        blueConnector = createBlueConnector(globalObject);
        blueCreateHooksCallbackCache.set(globalObject, blueConnector);
    }
    const redGlobalObject = runInNewContext('globalThis');
    const { eval: redIndirectEval } = redGlobalObject;
    const env = new VirtualEnvironment({
        blueConnector,
        redConnector: createRedConnector(
            signSourceCallback
                ? (sourceText: string) => redIndirectEval(signSourceCallback(sourceText))
                : redIndirectEval
        ),
        distortionCallback,
        instrumentation,
        liveTargetCallback,
        signSourceCallback,
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
