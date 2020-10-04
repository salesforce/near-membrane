import { SecureEnvironment } from "./environment";
import { EnvironmentOptions } from "./types";
import { unapply, ReflectGetOwnPropertyDescriptor, ObjectCreate } from "./shared";
import { linkIntrinsics, getFilteredEndowmentDescriptors } from "./intrinsics";
import { getCachedReferences, linkUnforgeables, tameDOM } from "./window";

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

interface BrowserEnvironmentOptions extends EnvironmentOptions {
    keepAlive?: boolean;
}

export default function createSecureEnvironment(options?: BrowserEnvironmentOptions): (sourceText: string) => void {
    const { distortionMap, endowments, keepAlive } = options || ObjectCreate(null);
    const iframe = createDetachableIframe();
    const blueWindow = window;
    const redWindow = (iframe.contentWindow as WindowProxy).window;
    const endowmentsDescriptors = getFilteredEndowmentDescriptors(endowments || {});
    const { eval: redIndirectEval } = redWindow;
    // extract the global references and descriptors before any interference
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
    // once we get the iframe info ready, and all mapped, we can proceed
    // to detach the iframe only if the keepAlive option isn't true
    if (keepAlive !== true) {
        removeIframe(iframe);
    }
    // finally, we return the evaluator function
    return (sourceText: string): void => {
        try {
            redIndirectEval(sourceText);
        } catch (e) {
            throw env.getBlueValue(e);
        }
    };
}
