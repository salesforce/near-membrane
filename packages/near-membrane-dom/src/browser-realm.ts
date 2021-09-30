import {
    getResolvedShapeDescriptors,
    init,
    initSourceTextInStrictMode,
    linkIntrinsics,
    DistortionCallback,
    SupportFlagsObject,
    VirtualEnvironment,
} from '@locker/near-membrane-base';

import { getCachedBlueReferences, linkUnforgeables, tameDOM } from './window';

const IFRAME_SANDBOX_ATTRIBUTE_VALUE = 'allow-same-origin allow-scripts';

const emptyArray: [] = [];
const {
    close: DocumentProtoClose,
    createElement: DocumentProtoCreateElement,
    open: DocumentProtoOpen,
} = document;
const { remove: ElementProtoRemove, setAttribute: ElementProtoSetAttribute } = Element.prototype;
const { appendChild: NodeProtoAppendChild } = Node.prototype;
const { assign: ObjectAssign } = Object;
const {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __lookupGetter__: ObjectProto__lookupGetter__,
    hasOwnProperty: ObjectProtoHasOwnProperty,
} = Object.prototype as any;
const { apply: ReflectApply } = Reflect;

function ObjectLookupOwnGetter(obj: object, key: PropertyKey): Function | undefined {
    // Since this function is only used internally, and would not otherwise be reachable
    // by user code, istanbul can ignore test coverage for the following condition.
    // istanbul ignore next
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    if (obj === null || obj === undefined || !ReflectApply(ObjectProtoHasOwnProperty, obj, [key])) {
        return undefined;
    }
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return ReflectApply(ObjectProto__lookupGetter__, obj, [key]);
}

const DocumentProtoBodyGetter = ObjectLookupOwnGetter(Document.prototype, 'body')!;
const HTMLElementProtoStyleGetter = ObjectLookupOwnGetter(HTMLElement.prototype, 'style')!;
const HTMLIFrameElementProtoContentWindowGetter = ObjectLookupOwnGetter(
    HTMLIFrameElement.prototype,
    'contentWindow'
)!;
const NodeProtoIsConnectedGetter = ObjectLookupOwnGetter(Node.prototype, 'isConnected')!;
const NodeProtoLastChildGetter = ObjectLookupOwnGetter(Node.prototype, 'lastChild')!;

function DocumentBody(doc: Document): typeof Document.prototype.body {
    return ReflectApply(DocumentProtoBodyGetter, doc, emptyArray);
}

function DocumentClose(doc: Document): ReturnType<typeof Document.prototype.close> {
    return ReflectApply(DocumentProtoClose, doc, emptyArray);
}

function DocumentCreateElement(
    doc: Document,
    tagName: string
): ReturnType<typeof Document.prototype.createElement> {
    return ReflectApply(DocumentProtoCreateElement, doc, [tagName]);
}

function DocumentOpen(doc: Document): ReturnType<typeof Document.prototype.open> {
    return ReflectApply(DocumentProtoOpen, doc, emptyArray);
}

function ElementSetAttribute(
    el: Element,
    name: string,
    value: string
): ReturnType<typeof Element.prototype.setAttribute> {
    return ReflectApply(ElementProtoSetAttribute, el, [name, value]);
}

function ElementRemove(element: Element): Element {
    return ReflectApply(ElementProtoRemove, element, emptyArray);
}

function HTMLElementStyleGetter(el: HTMLElement): typeof HTMLElement.prototype.style {
    return ReflectApply(HTMLElementProtoStyleGetter, el, emptyArray);
}

function HTMLIFrameElementContentWindowGetter(
    iframe: HTMLIFrameElement
): typeof HTMLIFrameElement.prototype.contentWindow {
    return ReflectApply(HTMLIFrameElementProtoContentWindowGetter, iframe, emptyArray);
}

function NodeAppendChild(parent: Node, child: ChildNode): ChildNode {
    return ReflectApply(NodeProtoAppendChild, parent, [child]);
}

// It's impossible to test whether NodeLastChild(document) is reached
// in a normal Karma test environment, because the document will always
// have a body element. Ignore this in coverage reporting to
// avoid a penalty.
// istanbul ignore next
function NodeLastChild(node: Node): typeof Node.prototype.lastChild {
    return ReflectApply(NodeProtoLastChildGetter, node, emptyArray);
}

function NodeIsConnected(node: Node): boolean {
    return ReflectApply(NodeProtoIsConnectedGetter, node, emptyArray);
}

function createDetachableIframe(): HTMLIFrameElement {
    // @ts-ignore document global ref - in browsers
    const iframe = DocumentCreateElement(document, 'iframe') as HTMLIFrameElement;
    // It's impossible to test whether NodeLastChild(document) is reached
    // in a normal Karma test environment. (See explanation above,
    // at NodeLastChild definition.)
    const parent = DocumentBody(document) || /* istanbul ignore next */ NodeLastChild(document);
    const style = HTMLElementStyleGetter(iframe);
    style.display = 'none';
    ElementSetAttribute(iframe, 'sandbox', IFRAME_SANDBOX_ATTRIBUTE_VALUE);
    NodeAppendChild(parent, iframe);
    return iframe;
}

function removeIframe(iframe: HTMLIFrameElement) {
    // In Chrome debugger statements will be ignored when the iframe is removed
    // from the document. Other browsers like Firefox and Safari work as expected.
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1015462

    // Because the detachable iframe is created, and then optionally removed, all
    // within the execution of createVirtualEnvironment, there is no point in which
    // test code can interfere with iframe element, or its prototype chain, in
    // order to remove it from the DOM, or stub the isConnected accessor
    // (the latter is already too late before createVirtualEnvironment is ever called).
    // For this reason, ignore the lack of `else` path coverage.
    //
    // istanbul ignore else
    if (NodeIsConnected(iframe)) {
        ElementRemove(iframe);
    }
}

interface BrowserEnvironmentOptions {
    distortionCallback?: DistortionCallback;
    endowments?: object;
    globalThis?: WindowProxy & typeof globalThis;
    keepAlive?: boolean;
    support?: SupportFlagsObject;
}

export default function createVirtualEnvironment(
    globalObjectShape: object,
    providedOptions?: BrowserEnvironmentOptions
): (sourceText: string) => void {
    // eslint-disable-next-line prefer-object-spread
    const options = ObjectAssign(
        {
            __proto__: null,
            globalThis: window,
            keepAlive: false,
        },
        providedOptions
    );
    // eslint-disable-next-line prefer-object-spread
    const {
        distortionCallback,
        endowments = {},
        globalThis: blueWindow,
        keepAlive,
        support,
    } = options;
    const iframe = createDetachableIframe();
    const redWindow = HTMLIFrameElementContentWindowGetter(iframe)!.window;
    const { document: redDocument } = redWindow;
    const blueConnector = init;
    const redConnector = redWindow.eval(initSourceTextInStrictMode);
    // extract the global references and descriptors before any interference
    const blueRefs = getCachedBlueReferences(blueWindow);
    // creating a new environment
    const env = new VirtualEnvironment({
        blueConnector,
        distortionCallback,
        redConnector,
        support,
    });
    env.link('window');
    linkIntrinsics(env, blueWindow);
    linkUnforgeables(env, blueWindow);
    tameDOM(env, blueRefs, getResolvedShapeDescriptors(globalObjectShape, endowments));
    // once we get the iframe info ready, and all mapped, we can proceed
    // to detach the iframe only if the keepAlive option isn't true
    if (keepAlive !== true) {
        removeIframe(iframe);
    } else {
        // TODO: temporary hack to preserve the document reference in FF
        // https://bugzilla.mozilla.org/show_bug.cgi?id=543435
        DocumentOpen(redDocument);
        DocumentClose(redDocument);
    }
    // finally, we return the evaluator function
    return (sourceText: string): void => env.evaluate(sourceText);
}
