import { isIntrinsicGlobalName, VirtualEnvironment } from '@locker/near-membrane-base';

const { assign: ObjectAssign, getOwnPropertyDescriptors: ObjectGetOwnPropertyDescriptors } = Object;

const {
    getPrototypeOf: ReflectGetPrototypeOf,
    ownKeys: ReflectOwnKeys,
    apply: ReflectApply,
} = Reflect;

const { get: WeakMapProtoGet, set: WeakMapProtoSet } = WeakMap.prototype;

function WeakMapGet(map: WeakMap<object, object>, key: object): object | undefined {
    return ReflectApply(WeakMapProtoGet, map, [key]);
}

function WeakMapSet(
    map: WeakMap<object, object>,
    key: object,
    value: object
): WeakMap<object, object> {
    return ReflectApply(WeakMapProtoSet, map, [key, value]);
}

/**
 * - Unforgeable object and prototype references
 */
interface BaseReferencesRecord extends Object {
    window: WindowProxy;
    document: Document;
    WindowProto: object;
    WindowPropertiesProto: object;
    EventTargetProto: object;
    DocumentProto: object;
}

/**
 * - Unforgeable blue object and prototype references
 * - Descriptor maps for those unforgeable references
 */
interface CachedBlueReferencesRecord extends BaseReferencesRecord {
    windowDescriptors: PropertyDescriptorMap;
    WindowProtoDescriptors: PropertyDescriptorMap;
    WindowPropertiesProtoDescriptors: PropertyDescriptorMap;
    EventTargetProtoDescriptors: PropertyDescriptorMap;
}

/**
 * - Unforgeable red object and prototype references
 * - Own keys for those unforgeable references
 */
interface RedReferencesRecord extends BaseReferencesRecord {
    windowOwnKeys: PropertyKey[];
    WindowPropertiesProtoOwnKeys: PropertyKey[];
}

const cachedBlueGlobalMap: WeakMap<typeof globalThis, CachedBlueReferencesRecord> = new WeakMap();

export function getBaseReferences(window: Window & typeof globalThis): BaseReferencesRecord {
    const record = ({ __proto__: null } as any) as BaseReferencesRecord;
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
    let record = WeakMapGet(cachedBlueGlobalMap, window) as CachedBlueReferencesRecord | undefined;
    if (record !== undefined) {
        return record;
    }
    record = getBaseReferences(window) as CachedBlueReferencesRecord;
    // caching the record
    WeakMapSet(cachedBlueGlobalMap, window, record);
    // caching descriptors
    record.windowDescriptors = ObjectGetOwnPropertyDescriptors(record.window);
    // intentionally avoiding remapping any Window.prototype descriptor,
    // there is nothing in this prototype that needs to be remapped.
    record.WindowProtoDescriptors = { __proto__: null } as any;
    // intentionally avoiding remapping any WindowProperties.prototype descriptor
    // because this object contains magical properties for HTMLObjectElement instances
    // and co, based on their id attribute. These cannot, and should not, be
    // remapped. Additionally, constructor is not relevant, and can't be used for anything.
    record.WindowPropertiesProtoDescriptors = { __proto__: null } as any;
    record.EventTargetProtoDescriptors = ObjectGetOwnPropertyDescriptors(record.EventTargetProto);

    return record;
}

export function getRedReferences(window: Window & typeof globalThis): RedReferencesRecord {
    const record = getBaseReferences(window) as RedReferencesRecord;
    // caching descriptors
    record.windowOwnKeys = ReflectOwnKeys(record.window);
    // intentionally avoiding remapping any WindowProperties.prototype descriptor
    // because this object contains magical properties for HTMLObjectElement instances
    // and co, based on their id attribute. These cannot, and should not, be
    // remapped. Additionally, constructor is not relevant, and can't be used for anything.
    record.WindowPropertiesProtoOwnKeys = [];

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
function aggregateWindowDescriptors(
    redOwnKeys: PropertyKey[],
    blueDescriptors: PropertyDescriptorMap,
    endowmentsDescriptors: PropertyDescriptorMap | undefined
): PropertyDescriptorMap {
    const to: PropertyDescriptorMap = { __proto__: null } as any;

    for (let i = 0, len = redOwnKeys.length; i < len; i += 1) {
        const key = redOwnKeys[i] as string;
        if (!isIntrinsicGlobalName(key)) {
            to[key] = blueDescriptors[key];
        }
    }

    // endowments descriptors will overrule any default descriptor inferred
    // from the detached iframe. note that they are already filtered, not need
    // to check against intrinsics again.
    ObjectAssign(to, endowmentsDescriptors);

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
function aggregateWindowPropertiesDescriptors(
    redOwnKeys: PropertyKey[],
    blueDescriptors: PropertyDescriptorMap
): PropertyDescriptorMap {
    const to: PropertyDescriptorMap = { __proto__: null } as any;
    // The following can be ignored because for now, redOwnKeys is
    // intentionally empty. In getRedReferences, see the following:
    //
    //      record.WindowPropertiesProtoOwnKeys = [];
    //
    // istanbul ignore next
    for (let i = 0, len = redOwnKeys.length; i < len; i += 1) {
        const key = redOwnKeys[i] as string;
        to[key] = blueDescriptors[key];
    }
    return to;
}

export function tameDOM(
    env: VirtualEnvironment,
    blueRefs: CachedBlueReferencesRecord,
    redRefs: RedReferencesRecord,
    endowmentsDescriptors: PropertyDescriptorMap
) {
    // adjusting proto chain of window.document
    env.remapProto(blueRefs.document, blueRefs.DocumentProto);
    const globalDescriptors = aggregateWindowDescriptors(
        redRefs.windowOwnKeys,
        blueRefs.windowDescriptors,
        endowmentsDescriptors
    );
    const WindowPropertiesDescriptors = aggregateWindowPropertiesDescriptors(
        redRefs.WindowPropertiesProtoOwnKeys,
        blueRefs.WindowPropertiesProtoDescriptors
    );
    // remapping globals
    env.remap(blueRefs.window, globalDescriptors);
    // remapping unforgeable objects
    env.remap(blueRefs.EventTargetProto, blueRefs.EventTargetProtoDescriptors);
    env.remap(blueRefs.WindowPropertiesProto, WindowPropertiesDescriptors);
    env.remap(blueRefs.WindowProto, blueRefs.WindowProtoDescriptors);
}

export function linkUnforgeables(
    env: VirtualEnvironment,
    blueGlobalThis: Window & typeof globalThis
) {
    // The test of instance of event target is important to discard environments in which
    // a fake window (e.g. jest) is not following the specs, and can break this
    // membrane.
    if (blueGlobalThis.EventTarget && blueGlobalThis instanceof EventTarget) {
        // window.document
        env.link(`document`);
        // window.__proto__ (aka Window.prototype)
        env.link(`__proto__`);
        // window.__proto__.__proto__ (aka WindowProperties.prototype)
        env.link(`__proto__`, `__proto__`);
        // window.__proto__.__proto__.__proto__ (aka EventTarget.prototype)
        env.link(`__proto__`, `__proto__`, `__proto__`);
    }
}
