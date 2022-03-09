const WeakMapCtor = WeakMap;
const { push: ArrayProtoPush } = Array.prototype;
const {
    apply: ReflectApply,
    getPrototypeOf: ReflectGetPrototypeOf,
    ownKeys: ReflectOwnKeys,
} = Reflect;
const { get: WeakMapProtoGet, set: WeakMapProtoSet } = WeakMapCtor.prototype;

/**
 * - Unforgeable object and prototype references
 */
interface CachedBlueReferencesRecord extends Object {
    document: Document;
    DocumentProto: object;
    window: WindowProxy;
    WindowProto: object;
    WindowPropertiesProto: object;
    EventTargetProto: object;
    EventTargetProtoOwnKeys: (string | symbol)[];
}

const blueGlobalToRecordMap: WeakMap<typeof globalThis, CachedBlueReferencesRecord> =
    new WeakMapCtor();

export function getCachedGlobalObjectReferences(
    globalObjectVirtualizationTarget: WindowProxy & typeof globalThis
): CachedBlueReferencesRecord {
    let record = ReflectApply(WeakMapProtoGet, blueGlobalToRecordMap, [
        globalObjectVirtualizationTarget,
    ]) as CachedBlueReferencesRecord | undefined;
    if (record) {
        return record;
    }
    // Cache references to object values that can't be replaced
    // window -> Window -> WindowProperties -> EventTarget
    const { document, window } = globalObjectVirtualizationTarget;
    const WindowProto = ReflectGetPrototypeOf(window)!;
    const WindowPropertiesProto = ReflectGetPrototypeOf(WindowProto)!;
    const EventTargetProto = ReflectGetPrototypeOf(WindowPropertiesProto)!;
    record = {
        document,
        DocumentProto: ReflectGetPrototypeOf(document)!,
        window,
        WindowProto,
        WindowPropertiesProto,
        EventTargetProto,
        EventTargetProtoOwnKeys: ReflectOwnKeys(EventTargetProto),
    } as CachedBlueReferencesRecord;
    ReflectApply(WeakMapProtoSet, blueGlobalToRecordMap, [
        globalObjectVirtualizationTarget,
        record,
    ]);
    return record;
}

/**
 * Initialization operation to capture and cache all unforgeable references
 * and their respective descriptor maps before any other code runs, this
 * usually help because this library runs before anything else that can poison
 * the environment.
 */
getCachedGlobalObjectReferences(window);

export function filterWindowKeys(keys: (string | symbol)[]): (string | symbol)[] {
    const result: (string | symbol)[] = [];
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
            ReflectApply(ArrayProtoPush, result, [key]);
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
export function removeWindowDescriptors<T extends PropertyDescriptorMap>(unsafeDescMap: T): T {
    // Remove unforgeable descriptors that cannot be installed.
    delete unsafeDescMap.document;
    delete unsafeDescMap.location;
    delete unsafeDescMap.top;
    delete unsafeDescMap.window;
    // Remove other browser specific unforgeables.
    delete unsafeDescMap.chrome;
    return unsafeDescMap;
}
