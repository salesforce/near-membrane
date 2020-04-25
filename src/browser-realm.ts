import { MembraneBroker } from "./environment";
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
    unapply,
    ReflectGetOwnPropertyDescriptor,
    deleteProperty,
    hasOwnProperty,
    SetHas,
    WeakMapSet,
} from "./shared";
import { SandboxRegistry } from "./registry";
import { serializedRedEnvSourceText } from "./red";
import { linkIntrinsics, ESGlobalKeys, getFilteredEndowmentDescriptors } from "./intrinsics";
import { blueProxyFactory, controlledEvaluator } from "./blue";
import { RedProxyTarget, RedEvaluator } from "./types";

/**
 * - Unforgeable prototype references
 * - Descriptor maps for those unforgeable prototype references
 */
interface CachedReferencesRecord {
    window: Window & typeof globalThis;
    document: Document;
    WindowProto: object;
    WindowPropertiesProto: object;
    EventTargetProto: object;
    DocumentProto: object;
    windowDescriptors: PropertyDescriptorMap;
    WindowProtoDescriptors: PropertyDescriptorMap;
    WindowPropertiesProtoDescriptors: PropertyDescriptorMap;
    EventTargetProtoDescriptors: PropertyDescriptorMap;
    hooks: typeof Reflect;
};

const cachedGlobalMap: WeakMap<typeof globalThis, CachedReferencesRecord> = WeakMapCreate();

/**
 * Given a Window reference, extract a set of references that are important
 * for the sandboxing mechanism, this includes:
 * - Unforgeable prototypes
 * - Descriptor maps for those unforgeable prototypes
 */
function getCachedReferences(window: Window & typeof globalThis): CachedReferencesRecord {
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

    // extra hooks
    record.hooks = ObjectCreate(null, getOwnPropertyDescriptors(window.Reflect));
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
    endowmentsDescriptors: PropertyDescriptorMap
): PropertyDescriptorMap {
    const to: PropertyDescriptorMap = ObjectCreate(null);

    const baseKeys = ownKeys(redDescriptors);
    for (let i = 0, len = baseKeys.length; i < len; i++) {
        const key = baseKeys[i] as string;
        // avoid overriding ECMAScript global keys
        if (!SetHas(ESGlobalKeys, key)) {
            to[key] = blueDescriptors[key];
        }
    }

    // endowments descriptors will overrule any default descriptor inferred
    // from the detached iframe. note that they are already filtered, not need
    // to check against intrinsics again.
    assign(to, endowmentsDescriptors);

    // removing unforgeable descriptors that cannot be installed
    delete to.location;
    delete to.EventTarget;
    delete to.document;
    delete to.window;
    delete to.top;
    // Some DOM APIs do brand checks for TypeArrays and others objects,
    // in this case, if the API is not dangerous, and works in a detached
    // iframe, we can let the sandbox to use the iframe's api directly,
    // instead of remapping it to the blue realm.
    // TODO [issue #67]: review this list
    delete to.crypto;

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
const appendChildCall = unapply(Node.prototype.appendChild);
const removeCall = unapply(Element.prototype.remove);
const isConnectedGetterCall = unapply((ReflectGetOwnPropertyDescriptor(Node.prototype, 'isConnected') as any).get);
const nodeLastChildGetterCall = unapply((ReflectGetOwnPropertyDescriptor(Node.prototype, 'lastChild') as any).get);
const documentBodyGetterCall = unapply((ReflectGetOwnPropertyDescriptor(Document.prototype, 'body') as any).get);
const createElementCall = unapply(document.createElement);

function createDetachableIframe(): HTMLIFrameElement {
    // @ts-ignore document global ref - in browsers
    const iframe = createElementCall(document, 'iframe');
    iframe.setAttribute('allow', IFRAME_ALLOW_ATTRIBUTE_VALUE);
    iframe.setAttribute('sandbox', IFRAME_SANDBOX_ATTRIBUTE_VALUE);
    iframe.style.display = 'none';
    const parent = documentBodyGetterCall(document) || nodeLastChildGetterCall(document);
    appendChildCall(parent, iframe);
    return iframe;
}

function createEvaluator(redWindow: Window): RedEvaluator {
    let redEvaluation: RedEvaluator;
    // For Chrome we evaluate the `window` object to kickstart the realm so that
    // `window` persists when the iframe is removed from the document.
    const { eval: redIndirectEval } = redWindow as any;
    redIndirectEval('window');
    redEvaluation = (sourceText, beforeEvaluateCallback, afterEvaluateCallback) => {
        beforeEvaluateCallback();
        redIndirectEval(sourceText);
        afterEvaluateCallback();
    };
    return redEvaluation;
}

function removeIframe(iframe: HTMLIFrameElement) {
    // In Chrome debugger statements will be ignored when the iframe is removed
    // from the document. Other browsers like Firefox and Safari work as expected.
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1015462
    if (isConnectedGetterCall(iframe)) {
        removeCall(iframe);
    }
}

function removeGlobalDescriptors(obj: object, endowmentsDescriptors: PropertyDescriptorMap) {
    const descriptors = getOwnPropertyDescriptors(obj);
    for (const key in descriptors) {
        // Optimization: if the descriptor key is a global name specified by EcmaScript,
        // or it is defined in endowments, it means it will be overrule by that, not need
        // to delete it.
        if (!SetHas(ESGlobalKeys, key) && !hasOwnProperty(endowmentsDescriptors, key)) {
            deleteProperty(obj, key);
        }
    }
}

function removeAllDescriptors(obj: object) {
    const descriptors = getOwnPropertyDescriptors(obj);
    for (const key in descriptors) {
        deleteProperty(obj, key);
    }
}

function bleachDOM(broker: MembraneBroker, blueRefs: CachedReferencesRecord, redRefs: CachedReferencesRecord, endowmentsDescriptors: PropertyDescriptorMap) {
    // window.document can't be removed from the sandbox, but can be nulled out by be a dummy object
    ReflectSetPrototypeOf(redRefs.document, redRefs.window.Object.prototype);
    // bleaching unforgeable
    removeGlobalDescriptors(redRefs.window, endowmentsDescriptors);
    removeAllDescriptors(redRefs.document);
    removeAllDescriptors(redRefs.EventTargetProto);
    removeAllDescriptors(redRefs.WindowPropertiesProto);
    removeAllDescriptors(redRefs.WindowProto);
    // remapping global endowments
    broker.remap(redRefs.window, blueRefs.window, endowmentsDescriptors);
}

function tameDOM(broker: MembraneBroker, blueRefs: CachedReferencesRecord, redRefs: CachedReferencesRecord, endowmentsDescriptors: PropertyDescriptorMap) {
    // adjusting proto chain of window.document
    ReflectSetPrototypeOf(redRefs.document, broker.getRedValue(blueRefs.DocumentProto));
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
    broker.remap(redRefs.window, blueRefs.window, globalDescriptors);
    // remapping unforgeable objects
    broker.remap(redRefs.EventTargetProto, blueRefs.EventTargetProto, blueRefs.EventTargetProtoDescriptors);
    broker.remap(redRefs.WindowPropertiesProto, blueRefs.WindowPropertiesProto, WindowPropertiesDescriptors);
    broker.remap(redRefs.WindowProto, blueRefs.WindowProto, blueRefs.WindowProtoDescriptors);
}

function initializeIframe(
    registry: SandboxRegistry,
    blueRefs: CachedReferencesRecord,
    redRefs: CachedReferencesRecord,
    options: BrowserEvaluationOptions,
    redEvaluation: RedEvaluator
) {
    const { type, endowments } = options;
    const endowmentsDescriptors = getFilteredEndowmentDescriptors(endowments);

    redEvaluation(
        `window.redProxyFactory=(${serializedRedEnvSourceText})`,
        () => undefined,
        () => {
            const { redProxyFactory } = redRefs.window as any;
            delete (redRefs.window as any).redProxyFactory;
            const membraneBroker = new MembraneBroker(
                registry,
                (broker: MembraneBroker) => blueProxyFactory(broker, redRefs.hooks),
                (broker: MembraneBroker) => redProxyFactory(broker, blueRefs.hooks)
            );
            if (type === 'no-dom') {
                bleachDOM(membraneBroker, blueRefs, redRefs, endowmentsDescriptors);
            } else if (type === 'new-dom') {
                tameDOM(membraneBroker, blueRefs, redRefs, endowmentsDescriptors);
            }
        }
    );
}

export function linkUnforgeables(
    registry: SandboxRegistry,
    blueRefs: CachedReferencesRecord,
    redRefs: CachedReferencesRecord
) {
    registry.setRefMapEntries(redRefs.window, blueRefs.window);
    registry.setRefMapEntries(redRefs.document, blueRefs.document);
    registry.setRefMapEntries(redRefs.EventTargetProto, blueRefs.EventTargetProto);
    registry.setRefMapEntries(redRefs.WindowPropertiesProto, blueRefs.WindowPropertiesProto);
    registry.setRefMapEntries(redRefs.WindowProto, blueRefs.WindowProto);
}

interface BrowserEvaluationOptions {
    // what kind of DOM APIs should be present.
    type: string; // <new-dom, no-dom>
    // the blue window to be used to create the sandbox
    window: Window & typeof globalThis;
    // additional globals to be installed inside the sandbox
    endowments: object;
    // distortions map
    distortions?: Map<RedProxyTarget, RedProxyTarget>;
}

export default function createSandboxEvaluator(registry: SandboxRegistry, options: BrowserEvaluationOptions): (sourceText: string) => void {
    const { window: blueWindow, type } = options;
    if (type !== 'new-dom' && type !== 'no-dom') {
        throw new RangeError(`Invalid options.type value "${type}", it only accept "new-dom" and "no-dom".`);
    }
    const iframe = createDetachableIframe();
    const redWindow = (iframe.contentWindow as WindowProxy).window;
    // extra the global references and descriptors before any interference
    const blueRefs = getCachedReferences(blueWindow);
    const redRefs = getCachedReferences(redWindow);
    // the evaluator depends on the mode, whether it is eval, or script
    const redEvaluator = createEvaluator(redWindow);
    linkIntrinsics(registry, blueWindow, redWindow);
    linkUnforgeables(registry, blueRefs, redRefs);
    initializeIframe(registry, blueRefs, redRefs, options, redEvaluator);

    // finally, we return the evaluator function wrapped by an error control flow
    return controlledEvaluator(registry, (sourceText) => {
        redEvaluator(sourceText, () => {
            removeIframe(iframe);
        }, () => undefined);
    });
}

export function evaluateSourceText(sourceText: string, options?: object) {
    const sb = new SandboxRegistry();
    const o: BrowserEvaluationOptions = assign({
        type: 'new-dom',
        window,
        endowments: {}
    }, options);
    if (!isUndefined(o.distortions)) {
        sb.addDistortions(o.distortions);
    }
    const evalScript = createSandboxEvaluator(sb, o);
    evalScript(sourceText);
}
