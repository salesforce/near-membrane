import { SecureEnvironment } from './environment';
import { EnvironmentOptions } from './types';
import { ObjectCreate, ObjectLookupOwnGetter, ReflectApply, emptyArray } from './shared';
import { linkIntrinsics, getFilteredEndowmentDescriptors } from './intrinsics';
import { getCachedBlueReferences, getRedReferences, linkUnforgeables, tameDOM } from './window';

const IFRAME_SANDBOX_ATTRIBUTE_VALUE = 'allow-same-origin allow-scripts';

const { createElement: DocumentCreateElement } = document;
const { remove: ElementProtoRemove } = Element.prototype;
const { appendChild: NodeProtoAppendChild } = Node.prototype;

const DocumentProtoBodyGetter = ObjectLookupOwnGetter(Document.prototype, 'body')!;
const NodeProtoIsConnectedGetter = ObjectLookupOwnGetter(Node.prototype, 'isConnected')!;
const NodeProtoLastChildGetter = ObjectLookupOwnGetter(Node.prototype, 'lastChild')!;

const DocumentBody = (doc: Document): HTMLBodyElement => ReflectApply(DocumentProtoBodyGetter, doc, emptyArray);
const ElementRemove = (element: Element): Element => ReflectApply(ElementProtoRemove, element, emptyArray);
const NodeAppendChild = (parent: Node, child: ChildNode): ChildNode => ReflectApply(NodeProtoAppendChild, parent, [child]);
const NodeLastChild = (node: Node): ChildNode => ReflectApply(NodeProtoLastChildGetter, node, emptyArray);

const createElement = (doc: Document, tagName: string): Element => ReflectApply(DocumentCreateElement, doc, [tagName]);
const isConnected = (node: Node): boolean => ReflectApply(NodeProtoIsConnectedGetter, node, emptyArray);

function createDetachableIframe(): HTMLIFrameElement {
    // @ts-ignore document global ref - in browsers
    const iframe = createElement(document, 'iframe') as HTMLIFrameElement;
    iframe.setAttribute('sandbox', IFRAME_SANDBOX_ATTRIBUTE_VALUE);
    iframe.style.display = 'none';
    const parent = DocumentBody(document) || NodeLastChild(document);
    NodeAppendChild(parent, iframe);
    return iframe;
}

function removeIframe(iframe: HTMLIFrameElement) {
    // In Chrome debugger statements will be ignored when the iframe is removed
    // from the document. Other browsers like Firefox and Safari work as expected.
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1015462
    if (isConnected(iframe)) {
        ElementRemove(iframe);
    }
}

interface BrowserEnvironmentOptions extends EnvironmentOptions {
    keepAlive?: boolean;
}

// caching references
const { open, close } = document;

export default function createSecureEnvironment(options?: BrowserEnvironmentOptions): (sourceText: string) => void {
    const { distortionMap, endowments, keepAlive } = options || ObjectCreate(null);
    const iframe = createDetachableIframe();
    const blueWindow = window;
    const redWindow = (iframe.contentWindow as WindowProxy).window;
    const endowmentsDescriptors = getFilteredEndowmentDescriptors(endowments || {});
    const { eval: redIndirectEval } = redWindow;
    // extract the global references and descriptors before any interference
    const blueRefs = getCachedBlueReferences(blueWindow);
    const redRefs = getRedReferences(redWindow);
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
    } else {
        // TODO: temporary hack to preserve the document reference in FF
        // https://bugzilla.mozilla.org/show_bug.cgi?id=543435
        open.call(redRefs.document);
        close.call(redRefs.document);
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
