import { SecureEnvironment } from "./environment";
import { RedProxyTarget, BlueFunction } from "./types";
import {
    ReflectGetPrototypeOf,
    ReflectSetPrototypeOf,
    getOwnPropertyDescriptors,
    construct,
    ErrorCreate,
    WeakMapCreate,
    isUndefined,
    ObjectCreate,
    WeakMapGet,
    assign,
    ownKeys,
} from "./shared";

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

/**
 * Given a Window reference, extract a set of references that are important
 * for the sandboxing mechanism, this includes:
 * - Unforgeable prototypes
 * - Descriptor maps for those unforgeable prototypes
 */
function getCachedReferences(global: typeof globalThis): CachedReferencesRecord {
    let record: CachedReferencesRecord | undefined = WeakMapGet(cachedGlobalMap, global);
    if (!isUndefined(record)) {
        return record;
    }
    record = ObjectCreate(null) as CachedReferencesRecord;
    // caching references to object values that can't be replaced
    // window -> Window -> WindowProperties -> EventTarget
    record.window = global.window;
    record.document = global.document;
    record.WindowProto = ReflectGetPrototypeOf(record.window);
    record.WindowPropertiesProto = ReflectGetPrototypeOf(record.WindowProto);
    record.EventTargetProto = ReflectGetPrototypeOf(record.WindowPropertiesProto);
    record.DocumentProto = ReflectGetPrototypeOf(record.document);

    // caching descriptors
    record.windowDescriptors = getOwnPropertyDescriptors(record.window);
    record.WindowProtoDescriptors = getOwnPropertyDescriptors(record.WindowProto);
    record.WindowPropertiesProtoDescriptors = getOwnPropertyDescriptors(record.WindowPropertiesProto);
    record.EventTargetProtoDescriptors = getOwnPropertyDescriptors(record.EventTargetProto);

    return record;
}

/**
 * Initialization operation to capture and cache all unforgeable references
 * and their respective descriptor maps before any other code runs, this
 * usually help because this library runs before anything else that can poison
 * the environment.
 */
getCachedReferences(globalThis);

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
function aggregateGlobalDescriptors(
    redDescriptors: PropertyDescriptorMap,
    blueDescriptors: PropertyDescriptorMap,
    globalDescriptors: PropertyDescriptorMap | undefined
): PropertyDescriptorMap {
    const to: PropertyDescriptorMap = ObjectCreate(null);
    const baseKeys = ownKeys(redDescriptors);

    for (let i = 0, len = baseKeys.length; i < len; i++) {
        const key = baseKeys[i] as string;
        to[key] = blueDescriptors[key];
    }

    // global descriptors are user provided descriptors via endowments
    // which will overrule any default descriptor inferred from the
    // detached iframe.
    assign(to, globalDescriptors);

    // removing unforgeable descriptors that cannot be installed
    delete to.location;
    delete to.document;
    delete to.window;
    // Some DOM APIs do brand checks for TypeArrays and others objects,
    // in this case, if the API is not dangerous, and works in a detached
    // iframe, we can let the sandbox to use the iframe's api directly,
    // instead of remapping it to the blue realm.
    // TODO [issue #67]: review this list
    delete to.crypto;

    return to;
}

// A comprehensive list of policy feature directives can be found at
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy#Directives
// Directives not currently supported by Chrome are commented out because
// Chrome logs warnings to the developer console.
const IFRAME_ALLOW_ATTRIBUTE_VALUE =
    "accelerometer 'none';" +
    "ambient-light-sensor 'none';" +
    "autoplay 'none';" +
    // "battery 'none';" +
    "camera 'none';" +
    // "display-capture 'none';" +
    "document-domain 'none';" +
    "encrypted-media 'none';" +
    // "execution-while-not-rendered 'none';" +
    // "execution-while-out-of-viewport 'none';" +
    "fullscreen 'none';" +
    "geolocation 'none';" +
    "gyroscope 'none';" +
    // "layout-animations 'none';" +
    // "legacy-image-formats 'none';" +
    "magnetometer 'none';" +
    "microphone 'none';" +
    "midi 'none';" +
    // "navigation-override 'none';" +
    // "oversized-images 'none';" +
    "payment 'none';" +
    "picture-in-picture 'none';" +
    // "publickey-credentials 'none';" +
    "sync-xhr 'none';" +
    "usb 'none';" +
    // "wake-lock 'none';" +
    "xr-spatial-tracking 'none';"

const IFRAME_SANDBOX_ATTRIBUTE_VALUE = 'allow-same-origin allow-scripts';

export default function createSecureEnvironment(distortionMap?: Map<RedProxyTarget, RedProxyTarget>, endowments?: object): (sourceText: string) => void {
    // @ts-ignore document global ref - in browsers
    const iframe = document.createElement('iframe');
    iframe.setAttribute('allow', IFRAME_ALLOW_ATTRIBUTE_VALUE);
    iframe.setAttribute('sandbox', IFRAME_SANDBOX_ATTRIBUTE_VALUE);
    iframe.style.display = 'none';

    // @ts-ignore document global ref - in browsers
    document.body.appendChild(iframe);

    // For Chrome we evaluate the `window` object to kickstart the realm so that
    // `window` persists when the iframe is removed from the document.
    const redGlobalThis = (iframe.contentWindow as WindowProxy).window;
    const { eval: redIndirectEval } = redGlobalThis;
    redIndirectEval('window');
    const blueGlobalThis = globalThis;

    // In Chrome debugger statements will be ignored when the iframe is removed
    // from the document. Other browsers like Firefox and Safari work as expected.
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1015462
    iframe.remove();

    const blueRefs = getCachedReferences(blueGlobalThis);
    const redRefs = getCachedReferences(redGlobalThis);

    const env = new SecureEnvironment({
        blueGlobalThis,
        redGlobalThis,
        distortionMap,
    });

    const globalDescriptors = aggregateGlobalDescriptors(
        redRefs.windowDescriptors,
        blueRefs.windowDescriptors,
        endowments && getOwnPropertyDescriptors(endowments)
    );

    // remapping globals
    env.remap(redRefs.window, blueRefs.window, globalDescriptors);

    // remapping unforgeable objects
    env.remap(redRefs.document, blueRefs.document); // no descriptors needed, document.location is unforgeable
    env.remap(redRefs.EventTargetProto, blueRefs.EventTargetProto, blueRefs.EventTargetProtoDescriptors);
    env.remap(redRefs.WindowPropertiesProto, blueRefs.WindowPropertiesProto, blueRefs.WindowPropertiesProtoDescriptors);
    env.remap(redRefs.WindowProto, blueRefs.WindowProto, blueRefs.WindowProtoDescriptors);

    // adjusting proto chains when possible
    ReflectSetPrototypeOf(redRefs.document, env.getRedValue(blueRefs.DocumentProto));

    // finally, we return the evaluator function
    return (sourceText: string): void => {
        try {
            redIndirectEval(sourceText);
        } catch (e) {
            // This error occurred when the blue realm attempts to evaluate a
            // sourceText into the sandbox. By throwing a new blue error, which
            // eliminates the stack information from the sandbox as a consequence.
            let blueError;
            const { message, constructor } = e;
            try {
                const blueErrorConstructor = env.getBlueRef(constructor);
                // the constructor must be registered (done during construction of env)
                // otherwise we need to fallback to a regular error.
                blueError = construct(blueErrorConstructor as BlueFunction, [message]);
            } catch {
                // in case the constructor inference fails
                blueError = ErrorCreate(message);
            }
            throw blueError;
        }
    };
}
