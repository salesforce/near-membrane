import { ArrayIsArray, toSafeArray } from './Array';
import { ReflectApply } from './Reflect';
import { RegExpProtoTest } from './RegExp';
import { SetCtor, toSafeSet } from './Set';
import { StringProtoStartsWith } from './String';
import { SandboxKey } from './types';

const gaterEnabledFeatures = toSafeSet(new SetCtor<string>());

const FEATURE_NAME_PREFIX = 'com.salesforce.locker.';

const fullName = (featureName: string) =>
    featureName.startsWith(FEATURE_NAME_PREFIX)
        ? featureName
        : `${FEATURE_NAME_PREFIX}${featureName}`;

export function registerGaterEnabledFeatures(lockerGaterEnabledFeatures: string[]): void {
    if (ArrayIsArray(lockerGaterEnabledFeatures)) {
        lockerGaterEnabledFeatures.forEach((feature) =>
            gaterEnabledFeatures.add(fullName(feature))
        );
    }
}

export function deregisterGaterEnabledFeatures(lockerGaterEnabledFeatures: string[]): void {
    if (ArrayIsArray(lockerGaterEnabledFeatures)) {
        lockerGaterEnabledFeatures.forEach((feature) =>
            gaterEnabledFeatures.delete(fullName(feature))
        );
    }
}

export function clearGaterEnabledFeatures(): void {
    gaterEnabledFeatures.clear();
}

export function isGaterEnabledFeature(featureName: string): boolean {
    return gaterEnabledFeatures.has(fullName(featureName));
}

export const ENABLE_MAX_PERF_MODE_GATE = 'enableMaxPerfMode';
export const ENABLE_SANDBOX_CREATED_INSTRUMENTATION_GATE = 'enableSandboxCreatedInstrumentation';
export const ENABLE_SANDBOXED_SAMEORIGIN_IFRAME_GATE = 'enableSandboxedSameOriginIframe';

type GaterEnabledOverridePredicate = (key: SandboxKey) => boolean;
type GaterEnabledOverridePredicates = GaterEnabledOverridePredicate[];

export const omnistudioPredicates: GaterEnabledOverridePredicates = [
    (key: SandboxKey) => key === 'omnistudio',
    (key: SandboxKey) => ReflectApply(StringProtoStartsWith, key, ['devopsimpkg']),
    (key: SandboxKey) => ReflectApply(RegExpProtoTest, /^devops\d{3}gs0/, [key]), // Matches devops001gs0, devops002gs0, etc
];

const consolidatedGaterEnabledOverridePredicates: GaterEnabledOverridePredicates = [
    ...omnistudioPredicates,
    // Allows for aggregating multiple lists
];

const gaterEnabledOverrideRegistry = {
    __proto__: null,
    $lwsBogusFeatureDisabledTrue: [() => true],
    $lwsBogusFeatureDisabledFalse: [() => false],
    [ENABLE_MAX_PERF_MODE_GATE]: consolidatedGaterEnabledOverridePredicates,
    // Temporarily disable this feature gate
    // Ref:
    //  "W-17049687: [LWS] Temporarily disable same origin iframe sandbox security fix for OS and devopsimpkg"
    //  https://gus.lightning.force.com/lightning/r/ADM_Work__c/a07EE000023unysYAA/view
    [ENABLE_SANDBOXED_SAMEORIGIN_IFRAME_GATE]: consolidatedGaterEnabledOverridePredicates,
} as unknown as { [key: string]: GaterEnabledOverridePredicates };

export function isAllowedToOverrideGaterEnabledFeature(
    sandboxKey: SandboxKey,
    featureName: string
): boolean {
    const gaterEnabledOverridePredicates: GaterEnabledOverridePredicates = toSafeArray(
        gaterEnabledOverrideRegistry[featureName] ?? []
    );
    return gaterEnabledOverridePredicates.some((predicate) => predicate(sandboxKey));
}

export function isNotAllowedToOverrideGaterEnabledFeature(
    ...args: Parameters<typeof isAllowedToOverrideGaterEnabledFeature>
): boolean {
    return !isAllowedToOverrideGaterEnabledFeature(...args);
}
