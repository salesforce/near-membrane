import { SecureEnvironment } from "./environment";
import {
    ReflectGetPrototypeOf,
    ReflectSetPrototypeOf,
    getOwnPropertyDescriptors,
    WeakMapCreate,
    isUndefined,
    ObjectCreate,
    WeakMapGet,
    assign,
    ownKeys,
    WeakMapSet,
} from "./shared";
import { isIntrinsicGlobalName } from "./intrinsics";

/**
 * - Unforgeable prototype references
 * - Descriptor maps for those unforgeable prototype references
 */
interface CachedReferencesRecord {
    window: WindowProxy;
    document: Document;
    WindowProto: object;
    WindowPropertiesProto: object;
    EventTargetProto: object;
    DocumentProto: object;
    windowDescriptors: PropertyDescriptorMap;
    WindowProtoDescriptors: PropertyDescriptorMap;
    WindowPropertiesProtoDescriptors: PropertyDescriptorMap;
    EventTargetProtoDescriptors: PropertyDescriptorMap;
};

const cachedGlobalMap: WeakMap<typeof globalThis, CachedReferencesRecord> = WeakMapCreate();

export function getCachedReferences(window: Window & typeof globalThis): CachedReferencesRecord {
    let record: CachedReferencesRecord | undefined = WeakMapGet(cachedGlobalMap, window);
    if (!isUndefined(record)) {
        return record;
    }
    record = ObjectCreate(null) as CachedReferencesRecord;
    // caching the record
    WeakMapSet(cachedGlobalMap, window, record);
    // caching references to object values that can't be replaced
    // window -> Window -> WindowProperties -> EventTarget
    record.window = window.window;
    record.document = window.document;
    record.WindowProto = ReflectGetPrototypeOf(record.window);
    record.WindowPropertiesProto = ReflectGetPrototypeOf(record.WindowProto);
    record.EventTargetProto = ReflectGetPrototypeOf(record.WindowPropertiesProto);
    record.DocumentProto = ReflectGetPrototypeOf(record.document);

    // caching descriptors
    record.windowDescriptors = getOwnPropertyDescriptors(record.window);
    // intentionally avoiding remapping any Window.prototype descriptor,
    // there is nothing in this prototype that needs to be remapped.
    record.WindowProtoDescriptors = ObjectCreate(null);
    // intentionally avoiding remapping any WindowProperties.prototype descriptor
    // because this object contains magical properties for HTMLObjectElement instances
    // and co, based on their id attribute. These cannot, and should not, be
    // remapped. Additionally, constructor is not relevant, and can't be used for anything.
    record.WindowPropertiesProtoDescriptors = ObjectCreate(null);
    record.EventTargetProtoDescriptors = getOwnPropertyDescriptors(record.EventTargetProto);

    return record;
}

/**
 * Initialization operation to capture and cache all unforgeable references
 * and their respective descriptor maps before any other code runs, this
 * usually help because this library runs before anything else that can poison
 * the environment.
 */
getCachedReferences(window);

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
function aggregateWindowDescriptors(
    redDescriptors: PropertyDescriptorMap,
    blueDescriptors: PropertyDescriptorMap,
    endowmentsDescriptors: PropertyDescriptorMap | undefined
): PropertyDescriptorMap {
    const to: PropertyDescriptorMap = ObjectCreate(null);
    const baseKeys = ownKeys(redDescriptors);

    for (let i = 0, len = baseKeys.length; i < len; i++) {
        const key = baseKeys[i] as string;
        if (!isIntrinsicGlobalName(key)) {
            to[key] = blueDescriptors[key];
        }
    }

    // endowments descriptors will overrule any default descriptor inferred
    // from the detached iframe. note that they are already filtered, not need
    // to check against intrinsics again.
    assign(to, endowmentsDescriptors);

    // removing unforgeable descriptors that cannot be installed
    delete to.location;
    delete to.document;
    delete to.window;
    delete to.top;
    // Some DOM APIs do brand checks for TypeArrays and others objects,
    // in this case, if the API is not dangerous, and works in a detached
    // iframe, we can let the sandbox to use the iframe's api directly,
    // instead of remapping it to the blue realm.
    // TODO [issue #67]: review this list
    delete to.crypto;
    // others browser specific undeniable globals
    delete to.chrome;
    return to;
}

/**
 * WindowProperties.prototype is magical, it provide access to any
 * object that "clobbers" the WindowProxy instance for easy access. E.g.:
 *
 *     var object = document.createElement('object');
 *     object.id = 'foo';
 *     document.body.appendChild(object);
 *
 * The result of this code is that `window.foo` points to the HTMLObjectElement
 * instance, and in some browsers, those are not even reported as descriptors
 * installed on WindowProperties.prototype, but they are instead magically
 * resolved when accessing `foo` from `window`.
 *
 * This forces us to avoid using the descriptors from the blue window directly,
 * and instead, we need to shadow only the descriptors installed in the brand
 * new iframe, that way any magical entry from the blue window will not be
 * installed on the iframe.
 */
export function aggregateWindowPropertiesDescriptors(
    redDescriptors: PropertyDescriptorMap,
    blueDescriptors: PropertyDescriptorMap
): PropertyDescriptorMap {
    const to: PropertyDescriptorMap = ObjectCreate(null);
    const baseKeys = ownKeys(redDescriptors);
    for (let i = 0, len = baseKeys.length; i < len; i++) {
        const key = baseKeys[i] as string;
        to[key] = blueDescriptors[key];
    }
    return to;
}

export function tameDOM(env: SecureEnvironment, blueRefs: CachedReferencesRecord, redRefs: CachedReferencesRecord, endowmentsDescriptors: PropertyDescriptorMap) {
    // adjusting proto chain of window.document
    ReflectSetPrototypeOf(redRefs.document, env.getRedValue(blueRefs.DocumentProto));
    const globalDescriptors = aggregateWindowDescriptors(
        redRefs.windowDescriptors,
        blueRefs.windowDescriptors,
        endowmentsDescriptors
    );
    const WindowPropertiesDescriptors = aggregateWindowPropertiesDescriptors(
        redRefs.WindowPropertiesProtoDescriptors,
        blueRefs.WindowPropertiesProtoDescriptors
    );
    // remapping globals
    env.remap(redRefs.window, blueRefs.window, globalDescriptors);
    // remapping unforgeable objects
    env.remap(redRefs.EventTargetProto, blueRefs.EventTargetProto, blueRefs.EventTargetProtoDescriptors);
    env.remap(redRefs.WindowPropertiesProto, blueRefs.WindowPropertiesProto, WindowPropertiesDescriptors);
    env.remap(redRefs.WindowProto, blueRefs.WindowProto, blueRefs.WindowProtoDescriptors);
}

export function linkUnforgeables(
    env: SecureEnvironment,
    blueRefs: CachedReferencesRecord,
    redRefs: CachedReferencesRecord
) {
    env.setRefMapEntries(redRefs.window, blueRefs.window);
    env.setRefMapEntries(redRefs.document, blueRefs.document);
    env.setRefMapEntries(redRefs.EventTargetProto, blueRefs.EventTargetProto);
    env.setRefMapEntries(redRefs.WindowPropertiesProto, blueRefs.WindowPropertiesProto);
    env.setRefMapEntries(redRefs.WindowProto, blueRefs.WindowProto);
}
