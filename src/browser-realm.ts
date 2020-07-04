import { SecureEnvironment } from "./environment";
import { RedProxyTarget } from "./types";
import { unapply, ReflectGetOwnPropertyDescriptor } from "./shared";
import { linkIntrinsics, getFilteredEndowmentDescriptors } from "./intrinsics";
import { getCachedReferences, linkUnforgeables, tameDOM } from "./window";

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

function removeIframe(iframe: HTMLIFrameElement) {
    // In Chrome debugger statements will be ignored when the iframe is removed
    // from the document. Other browsers like Firefox and Safari work as expected.
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1015462
    if (isConnectedGetterCall(iframe)) {
        removeCall(iframe);
    }
}

export default function createSecureEnvironment(distortionMap?: Map<RedProxyTarget, RedProxyTarget>, endowments?: object): (sourceText: string) => void {
    const iframe = createDetachableIframe();
    const blueWindow = window;
    const redWindow = (iframe.contentWindow as WindowProxy).window;
    const endowmentsDescriptors = getFilteredEndowmentDescriptors(endowments || {});
    const { eval: redIndirectEval } = redWindow;
    // extra the global references and descriptors before any interference
    const blueRefs = getCachedReferences(blueWindow);
    const redRefs = getCachedReferences(redWindow);
    // creating a new environment
    const env = new SecureEnvironment({
        blueGlobalThis: blueWindow,
        redGlobalThis: redWindow,
        distortionMap,
    });
    linkIntrinsics(env, blueWindow, redWindow);
    linkUnforgeables(env, blueRefs, redRefs);
    tameDOM(env, blueRefs, redRefs, endowmentsDescriptors);
    // once we get the iframe info ready, and all mapped, we can proceed to detach the iframe
    removeIframe(iframe);
    // finally, we return the evaluator function
    return (sourceText: string): void => {
        try {
            redIndirectEval(sourceText);
        } catch (e) {
            throw env.getBlueValue(e);
        }
    };
}
