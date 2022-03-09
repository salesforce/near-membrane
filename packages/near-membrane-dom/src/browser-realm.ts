import {
    assignFilteredGlobalDescriptorsFromPropertyDescriptorMap,
    createConnector,
    createMembraneMarshall,
    getFilteredGlobalOwnKeys,
    linkIntrinsics,
    DistortionCallback,
    InstrumentationHooks,
    VirtualEnvironment,
} from '@locker/near-membrane-base';

import {
    getCachedGlobalObjectReferences,
    filterWindowKeys,
    linkUnforgeables,
    removeWindowDescriptors,
} from './window';

const IFRAME_SANDBOX_ATTRIBUTE_VALUE = 'allow-same-origin allow-scripts';

const ObjectCtor = Object;
const TypeErrorCtor = TypeError;
const { prototype: DocumentProto } = Document;
const { prototype: NodeProto } = Node;
const { remove: ElementProtoRemove, setAttribute: ElementProtoSetAttribute } = Element.prototype;
const { appendChild: NodeProtoAppendChild } = NodeProto;
const { assign: ObjectAssign } = ObjectCtor;
// eslint-disable-next-line @typescript-eslint/naming-convention
const { __lookupGetter__: ObjectProto__lookupGetter__ } = ObjectCtor.prototype as any;
const { apply: ReflectApply } = Reflect;
const {
    close: DocumentProtoClose,
    createElement: DocumentProtoCreateElement,
    open: DocumentProtoOpen,
} = DocumentProto;
const DocumentProtoBodyGetter = ReflectApply(ObjectProto__lookupGetter__, DocumentProto, ['body'])!;
const HTMLElementProtoStyleGetter = ReflectApply(
    ObjectProto__lookupGetter__,
    HTMLElement.prototype,
    ['style']
)!;
const HTMLIFrameElementProtoContentWindowGetter = ReflectApply(
    ObjectProto__lookupGetter__,
    HTMLIFrameElement.prototype,
    ['contentWindow']
)!;
const NodeProtoLastChildGetter = ReflectApply(ObjectProto__lookupGetter__, NodeProto, [
    'lastChild',
])!;
const docRef = document;

interface BrowserEnvironmentOptions {
    distortionCallback?: DistortionCallback;
    endowments?: PropertyDescriptorMap;
    keepAlive?: boolean;
    instrumentation?: InstrumentationHooks;
}

const createHooksCallback = createMembraneMarshall();

let defaultGlobalOwnKeys: (string | symbol)[] | null = null;

function createDetachableIframe(): HTMLIFrameElement {
    const iframe = ReflectApply(DocumentProtoCreateElement, docRef, [
        'iframe',
    ]) as HTMLIFrameElement;
    // It is impossible to test whether the NodeProtoLastChildGetter branch is
    // reached in a normal Karma test environment.
    const parent =
        ReflectApply(DocumentProtoBodyGetter, docRef, []) ||
        /* istanbul ignore next */ ReflectApply(NodeProtoLastChildGetter, docRef, []);
    const style = ReflectApply(HTMLElementProtoStyleGetter, iframe, []);
    style.display = 'none';
    ReflectApply(ElementProtoSetAttribute, iframe, ['sandbox', IFRAME_SANDBOX_ATTRIBUTE_VALUE]);
    ReflectApply(NodeProtoAppendChild, parent, [iframe]);
    return iframe;
}

export default function createVirtualEnvironment(
    globalObjectShape: object | null,
    globalObjectVirtualizationTarget: WindowProxy & typeof globalThis,
    providedOptions?: BrowserEnvironmentOptions
): VirtualEnvironment {
    if (typeof globalObjectShape !== 'object') {
        throw new TypeErrorCtor('Missing global object shape.');
    }
    if (
        typeof globalObjectVirtualizationTarget !== 'object' ||
        globalObjectVirtualizationTarget === null
    ) {
        throw new TypeErrorCtor('Missing global object virtualization target.');
    }
    const {
        distortionCallback,
        endowments,
        instrumentation,
        keepAlive = false,
        // eslint-disable-next-line prefer-object-spread
    } = ObjectAssign({ __proto__: null }, providedOptions);
    const iframe = createDetachableIframe();
    const redWindow = ReflectApply(HTMLIFrameElementProtoContentWindowGetter, iframe, [])!.window;
    let globalOwnKeys;
    if (globalObjectShape === null) {
        if (defaultGlobalOwnKeys === null) {
            defaultGlobalOwnKeys = filterWindowKeys(getFilteredGlobalOwnKeys(redWindow));
        }
        globalOwnKeys = defaultGlobalOwnKeys;
    } else {
        globalOwnKeys = filterWindowKeys(getFilteredGlobalOwnKeys(globalObjectShape));
    }
    const filteredEndowments = {};
    assignFilteredGlobalDescriptorsFromPropertyDescriptorMap(filteredEndowments, endowments);
    removeWindowDescriptors(filteredEndowments);
    const { document: redDocument } = redWindow;
    const blueConnector = createHooksCallback;
    const redConnector = createConnector(redWindow.eval);
    // Extract the global references and descriptors before any interference.
    const blueRefs = getCachedGlobalObjectReferences(globalObjectVirtualizationTarget);
    // Create a new environment.
    const env = new VirtualEnvironment({
        blueConnector,
        distortionCallback,
        redConnector,
        instrumentation,
    });
    env.link('window');
    linkIntrinsics(env, globalObjectVirtualizationTarget);
    linkUnforgeables(env);
    env.remapProto(blueRefs.document, blueRefs.DocumentProto);
    env.lazyRemap(blueRefs.window, globalOwnKeys);
    env.remap(blueRefs.window, filteredEndowments);
    // We intentionally skip remapping Window.prototype because there is nothing
    // in it that needs to be remapped.
    env.lazyRemap(blueRefs.EventTargetProto, blueRefs.EventTargetProtoOwnKeys);
    // We don't remap `blueRefs.WindowPropertiesProto` because it is "magical"
    // in that it provides access to elements by id.
    //
    // Once we get the iframe info ready, and all mapped, we can proceed
    // to detach the iframe only if the keepAlive option isn't true.
    if (keepAlive !== true) {
        ReflectApply(ElementProtoRemove, iframe, []);
    } else {
        // TODO: Temporary hack to preserve the document reference in Firefox.
        // https://bugzilla.mozilla.org/show_bug.cgi?id=543435
        ReflectApply(DocumentProtoOpen, redDocument, []);
        ReflectApply(DocumentProtoClose, redDocument, []);
    }
    return env;
}
