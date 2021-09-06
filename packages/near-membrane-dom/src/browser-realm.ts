import {
    init,
    VirtualEnvironment,
    getFilteredEndowmentDescriptors,
    ProxyTarget,
} from '@locker/near-membrane-base';

import { getCachedBlueReferences, getRedReferences, tameDOM } from './window';

interface EnvironmentOptions {
    distortionCallback?: (originalTarget: ProxyTarget) => ProxyTarget;
    endowments?: object;
    globalThis: WindowProxy & typeof globalThis;
}

const emptyArray: [] = [];
const IFRAME_SANDBOX_ATTRIBUTE_VALUE = 'allow-same-origin allow-scripts';
// TODO: how to guarantee that the function is actually running in strict mode?
const initSourceText = `(function(){'use strict';return (${init.toString()})})()`;
const TypeErrorCtor = TypeError;

const { createElement: DocumentCreateElement } = document;
const { remove: ElementProtoRemove } = Element.prototype;
const { appendChild: NodeProtoAppendChild } = Node.prototype;
const { apply: ReflectApply } = Reflect;
const {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __lookupGetter__: ObjectProto__lookupGetter__,
    hasOwnProperty: ObjectProtoHasOwnProperty,
} = Object.prototype as any;

function ObjectLookupOwnGetter(obj: object, key: PropertyKey): Function | undefined {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    if (obj === null || obj === undefined || !ReflectApply(ObjectProtoHasOwnProperty, obj, [key])) {
        return undefined;
    }
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return ReflectApply(ObjectProto__lookupGetter__, obj, [key]);
}

const DocumentProtoBodyGetter = ObjectLookupOwnGetter(Document.prototype, 'body')!;
const NodeProtoIsConnectedGetter = ObjectLookupOwnGetter(Node.prototype, 'isConnected')!;
const NodeProtoLastChildGetter = ObjectLookupOwnGetter(Node.prototype, 'lastChild')!;

const DocumentBody = (doc: Document): HTMLBodyElement =>
    ReflectApply(DocumentProtoBodyGetter, doc, emptyArray);
const ElementRemove = (element: Element): Element =>
    ReflectApply(ElementProtoRemove, element, emptyArray);
const NodeAppendChild = (parent: Node, child: ChildNode): ChildNode =>
    ReflectApply(NodeProtoAppendChild, parent, [child]);

// It's impossible to test whether NodeLastChild(document) is reached
// in a normal Karma test environment, because the document will always
// have a body element. Ignore this in coverage reporting to
// avoid a penalty.
// istanbul ignore next
const NodeLastChild = (node: Node): ChildNode =>
    ReflectApply(NodeProtoLastChildGetter, node, emptyArray);

const createElement = (doc: Document, tagName: string): Element =>
    ReflectApply(DocumentCreateElement, doc, [tagName]);
const isConnected = (node: Node): boolean =>
    ReflectApply(NodeProtoIsConnectedGetter, node, emptyArray);

function createDetachableIframe(): HTMLIFrameElement {
    // @ts-ignore document global ref - in browsers
    const iframe = createElement(document, 'iframe') as HTMLIFrameElement;
    iframe.setAttribute('sandbox', IFRAME_SANDBOX_ATTRIBUTE_VALUE);
    iframe.style.display = 'none';
    // It's impossible to test whether NodeLastChild(document) is reached
    // in a normal Karma test environment. (See explanation above,
    // at NodeLastChild definition.)
    const parent = DocumentBody(document) || /* istanbul ignore next */ NodeLastChild(document);
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
    if (isConnected(iframe)) {
        ElementRemove(iframe);
    }
}

interface BrowserEnvironmentOptions extends EnvironmentOptions {
    keepAlive?: boolean;
}

// caching references
const { open, close } = document;

export default function createVirtualEnvironment(
    options?: BrowserEnvironmentOptions
): (sourceText: string) => void {
    const { distortionCallback, endowments, keepAlive, globalThis = window } = options || {
        __proto__: null,
    };
    const iframe = createDetachableIframe();
    const blueWindow = globalThis;
    const redWindow = (iframe.contentWindow as WindowProxy).window;
    const endowmentsDescriptors = getFilteredEndowmentDescriptors(endowments || {});
    const blueConnector = init;
    const redConnector = redWindow.eval(initSourceText);
    // extract the global references and descriptors before any interference
    const blueRefs = getCachedBlueReferences(blueWindow);
    const redRefs = getRedReferences(redWindow);
    // creating a new environment
    const env = new VirtualEnvironment({
        blueConnector,
        redConnector,
        distortionCallback,
    });
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
            env.evaluate(sourceText);
        } catch (e) {
            // TODO: what error should we throw here?
            throw new TypeErrorCtor();
        }
    };
}
