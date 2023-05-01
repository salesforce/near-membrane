import {
    ReflectDeleteProperty,
    ReflectGetPrototypeOf,
    ReflectOwnKeys,
    toSafeWeakMap,
} from '@locker/near-membrane-shared';
import { IS_CHROMIUM_BROWSER, rootWindow } from '@locker/near-membrane-shared-dom';

interface CachedBlueReferencesRecord extends Object {
    document: Document;
    DocumentProto: object;
    window: WindowProxy;
    WindowProto: object;
    WindowPropertiesProto: object;
    EventTargetProto: object;
    EventTargetProtoOwnKeys: PropertyKey[];
}

const blueDocumentToRecordMap: WeakMap<Document, CachedBlueReferencesRecord> = toSafeWeakMap(
    new WeakMap()
);

// Chromium based browsers have a bug that nulls the result of `window`
// getters in detached iframes when the property descriptor of `window.window`
// is retrieved.
// https://bugs.chromium.org/p/chromium/issues/detail?id=1305302
export const unforgeablePoisonedWindowKeys = IS_CHROMIUM_BROWSER ? ['window'] : undefined;

export function getCachedGlobalObjectReferences(
    globalObject: WindowProxy & typeof globalThis
): CachedBlueReferencesRecord | undefined {
    const { window } = globalObject;
    let record: CachedBlueReferencesRecord | undefined;
    let document: Document | undefined;
    // Suppress errors thrown on cross-origin opaque windows.
    try {
        ({ document } = globalObject);
        record = blueDocumentToRecordMap.get(document) as CachedBlueReferencesRecord | undefined;
        // eslint-disable-next-line no-empty
    } catch {
        return undefined;
    }
    if (record) {
        return record;
    }
    // Cache references to object values that can't be replaced
    // window -> Window -> WindowProperties -> EventTarget
    const WindowProto = ReflectGetPrototypeOf(window)!;
    const WindowPropertiesProto = ReflectGetPrototypeOf(WindowProto)!;
    const EventTargetProto = ReflectGetPrototypeOf(WindowPropertiesProto)!;
    record = {
        document,
        DocumentProto: ReflectGetPrototypeOf(document!)!,
        window,
        WindowProto: ReflectGetPrototypeOf(window)!,
        WindowPropertiesProto: ReflectGetPrototypeOf(WindowProto)!,
        EventTargetProto,
        EventTargetProtoOwnKeys: EventTargetProto ? ReflectOwnKeys(EventTargetProto) : [],
    } as CachedBlueReferencesRecord;
    blueDocumentToRecordMap.set(document, record);
    return record;
}

export function filterWindowKeys(keys: PropertyKey[]): PropertyKey[] {
    const result: PropertyKey[] = [];
    let resultOffset = 0;
    for (let i = 0, { length } = keys; i < length; i += 1) {
        const key = keys[i];
        if (
            // Filter out unforgeable property keys that cannot be installed.
            key !== 'document' &&
            key !== 'location ' &&
            key !== 'top' &&
            key !== 'window' &&
            // Remove other browser specific unforgeables.
            key !== 'chrome'
        ) {
            result[resultOffset++] = key;
        }
    }
    return result;
}

/**
 * global descriptors are a combination of 3 set of descriptors:
 * - first, the key of the red descriptors define the descriptors
 *   provided by the browser when creating a brand new window.
 * - second, once we know the base keys, we get the actual descriptors
 *   from the blueDescriptors, since those are the one we want to provide
 *   access to via the membrane.
 * - third, the user of this library can provide endowments, which define
 *   global descriptors that should be installed into the sandbox on top
 *   of the base descriptors.
 *
 * Note: The main reason for using redDescriptors as the base keys instead
 * of blueDescriptor is because there is no guarantee that this library is
 * the first one to be evaluated in the host app, which means it has no ways
 * to determine what is a real DOM API vs app specific globals.
 *
 * Quirk: The only quirk here is for the case in which this library runs
 * after some other code that patches some of the DOM APIs. This means
 * the installed proxy in the sandbox will point to the patched global
 * API in the blue realm, rather than the original, because we don't have
 * a way to access the original anymore. This should not be a deal-breaker
 * if the patched API behaves according to the spec.
 *
 * The result of this method is a descriptor map that contains everything
 * that will be installed (via the membrane) as global descriptors in
 * the red realm.
 */
export function removeWindowDescriptors<T extends PropertyDescriptorMap>(unsafeDescs: T): T {
    // Remove unforgeable descriptors that cannot be installed.
    ReflectDeleteProperty(unsafeDescs, 'document');
    ReflectDeleteProperty(unsafeDescs, 'location');
    ReflectDeleteProperty(unsafeDescs, 'top');
    ReflectDeleteProperty(unsafeDescs, 'window');
    // Remove other browser specific unforgeables.
    ReflectDeleteProperty(unsafeDescs, 'chrome');
    return unsafeDescs;
}

/**
 * Initialization operation to capture and cache all unforgeable references
 * and their respective descriptor maps before any other code runs, this
 * usually help because this library runs before anything else that can poison
 * the environment.
 */
getCachedGlobalObjectReferences(rootWindow);
