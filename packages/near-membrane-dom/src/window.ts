import { VirtualEnvironment } from '@locker/near-membrane-base';

const { assign: ObjectAssign, getOwnPropertyDescriptors: ObjectGetOwnPropertyDescriptors } = Object;
const { getPrototypeOf: ReflectGetPrototypeOf, apply: ReflectApply } = Reflect;
const { get: WeakMapProtoGet, set: WeakMapProtoSet } = WeakMap.prototype;

/**
 * - Unforgeable object and prototype references
 */
interface BaseReferencesRecord extends Object {
    document: Document;
    window: WindowProxy;
    DocumentProto: object;
    EventTargetProto: object;
    WindowPropertiesProto: object;
    WindowProto: object;
}

/**
 * - Unforgeable blue object and prototype references
 * - Descriptor maps for those unforgeable references
 */
interface CachedBlueReferencesRecord extends BaseReferencesRecord {
    EventTargetProtoDescriptors: PropertyDescriptorMap;
}

const cachedBlueGlobalMap: WeakMap<typeof globalThis, CachedBlueReferencesRecord> = new WeakMap();

export function getBaseReferences(window: Window & typeof globalThis): BaseReferencesRecord {
    const record = { __proto__: null } as any as BaseReferencesRecord;
    // caching references to object values that can't be replaced
    // window -> Window -> WindowProperties -> EventTarget
    record.window = window.window;
    record.document = window.document;
    record.WindowProto = ReflectGetPrototypeOf(record.window) as object;
    record.WindowPropertiesProto = ReflectGetPrototypeOf(record.WindowProto) as object;
    record.EventTargetProto = ReflectGetPrototypeOf(record.WindowPropertiesProto) as object;
    record.DocumentProto = ReflectGetPrototypeOf(record.document) as object;

    return record;
}

export function getCachedBlueReferences(
    window: Window & typeof globalThis
): CachedBlueReferencesRecord {
    let record = ReflectApply(WeakMapProtoGet, cachedBlueGlobalMap, [window]) as
        | CachedBlueReferencesRecord
        | undefined;
    if (record) {
        return record;
    }
    record = getBaseReferences(window) as CachedBlueReferencesRecord;
    // caching the record
    ReflectApply(WeakMapProtoSet, cachedBlueGlobalMap, [window, record]);
    // intentionally avoiding remapping any Window.prototype descriptor,
    // there is nothing in this prototype that needs to be remapped.
    record.EventTargetProtoDescriptors = ObjectGetOwnPropertyDescriptors(record.EventTargetProto);

    return record;
}

/**
 * Initialization operation to capture and cache all unforgeable references
 * and their respective descriptor maps before any other code runs, this
 * usually help because this library runs before anything else that can poison
 * the environment.
 */
getCachedBlueReferences(window);

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
function filterWindowDescriptors(
    unsafeEndowmentsDescMap: PropertyDescriptorMap | undefined
): PropertyDescriptorMap {
    const unsafeDescMap: PropertyDescriptorMap = {};
    // Endowments descriptors will overrule any default descriptor inferred
    // from the detached iframe. note that they are already filtered, not need
    // to check against intrinsics again.
    ObjectAssign(unsafeDescMap, unsafeEndowmentsDescMap);
    // Removing unforgeable descriptors that cannot be installed
    delete unsafeDescMap.document;
    delete unsafeDescMap.location;
    delete unsafeDescMap.top;
    delete unsafeDescMap.window;
    // Other browser specific undeniable globals
    delete unsafeDescMap.chrome;
    return unsafeDescMap;
}

export function tameDOM(
    env: VirtualEnvironment,
    blueRefs: CachedBlueReferencesRecord,
    unsafeEndowmentsDescMap: PropertyDescriptorMap
) {
    // adjusting proto chain of window.document
    env.remapProto(blueRefs.document, blueRefs.DocumentProto);
    const unsafeGlobalDescMap = filterWindowDescriptors(unsafeEndowmentsDescMap);
    // remapping globals
    env.remap(blueRefs.window, unsafeGlobalDescMap);
    // remapping unforgeable objects
    env.remap(blueRefs.EventTargetProto, blueRefs.EventTargetProtoDescriptors);
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
     * and instead, we might only need to shadow the descriptors installed in the brand
     * new iframe, that way any magical entry from the blue window will not be
     * installed on the iframe. That turns out to be also empty, therefore we
     * don't need to remap `blueRefs.WindowPropertiesProto` descriptors at all.
     */
}

export function linkUnforgeables(
    env: VirtualEnvironment,
    blueGlobalThis: Window & typeof globalThis
) {
    // The test of instance of event target is important to discard environments
    // in which a fake window (e.g. jest) is not following the specs, and can
    // break this membrane.
    if (blueGlobalThis.EventTarget && blueGlobalThis instanceof EventTarget) {
        // window.document
        env.link('document');
        // window.__proto__ (aka Window.prototype)
        env.link('__proto__');
        // window.__proto__.__proto__ (aka WindowProperties.prototype)
        env.link('__proto__', '__proto__');
        // window.__proto__.__proto__.__proto__ (aka EventTarget.prototype)
        env.link('__proto__', '__proto__', '__proto__');
    }
}
