import {
    assignFilteredGlobalDescriptorsFromPropertyDescriptorMap,
    createBlueConnector,
    createRedConnector,
    getFilteredGlobalOwnKeys,
    linkIntrinsics,
    VirtualEnvironment,
} from '@locker/near-membrane-base';
import {
    isObject,
    ObjectAssign,
    ReflectApply,
    toSafeWeakMap,
    toSafeWeakSet,
    TypeErrorCtor,
    WeakMapCtor,
    WeakSetCtor,
} from '@locker/near-membrane-shared';
import {
    DocumentProtoBodyGetter,
    DocumentProtoClose,
    DocumentProtoCreateElement,
    DocumentProtoOpen,
    ElementProtoRemove,
    ElementProtoSetAttribute,
    HTMLElementProtoStyleGetter,
    HTMLIFrameElementProtoContentWindowGetter,
    IS_OLD_CHROMIUM_BROWSER,
    NodeProtoAppendChild,
    NodeProtoLastChildGetter,
} from '@locker/near-membrane-shared-dom';
import type { Connector } from '@locker/near-membrane-base';
import type { ProxyTarget } from '@locker/near-membrane-shared';
import type { GlobalObject } from '@locker/near-membrane-shared-dom';
import type { BrowserEnvironmentOptions } from './types';
import {
    getCachedGlobalObjectReferences,
    filterWindowKeys,
    removeWindowDescriptors,
    unforgeablePoisonedWindowKeys,
} from './window';

const IFRAME_SANDBOX_ATTRIBUTE_VALUE = 'allow-same-origin allow-scripts';

const revoked = toSafeWeakSet(new WeakSetCtor<GlobalObject | Node>());
const blueCreateHooksCallbackCache = toSafeWeakMap(new WeakMapCtor<Document, Connector>());

let defaultGlobalOwnKeys: PropertyKey[] | null = null;

function createDetachableIframe(doc: Document): HTMLIFrameElement {
    const iframe = ReflectApply(DocumentProtoCreateElement, doc, ['iframe']) as HTMLIFrameElement;
    // It is impossible to test whether the NodeProtoLastChildGetter branch is
    // reached in a normal Karma test environment.
    const parent: Element =
        ReflectApply(DocumentProtoBodyGetter, doc, []) ??
        /* istanbul ignore next */ ReflectApply(NodeProtoLastChildGetter, doc, []);
    const style: CSSStyleDeclaration = ReflectApply(HTMLElementProtoStyleGetter, iframe, []);
    style.display = 'none';
    ReflectApply(ElementProtoSetAttribute, iframe, ['sandbox', IFRAME_SANDBOX_ATTRIBUTE_VALUE]);
    ReflectApply(NodeProtoAppendChild, parent, [iframe]);
    return iframe;
}

function createIframeVirtualEnvironment(
    globalObject: WindowProxy & typeof globalThis,
    providedOptions?: BrowserEnvironmentOptions
): VirtualEnvironment {
    if (typeof globalObject !== 'object' || globalObject === null) {
        throw new TypeErrorCtor('Missing global object virtualization target.');
    }
    const blueRefs = getCachedGlobalObjectReferences(globalObject);
    if (typeof blueRefs !== 'object' || blueRefs === null) {
        throw new TypeErrorCtor('Invalid virtualization target.');
    }
    const {
        distortionCallback,
        defaultPolicy,
        endowments,
        globalObjectShape,
        instrumentation,
        keepAlive = true,
        liveTargetCallback,
        signSourceCallback,
        // eslint-disable-next-line prefer-object-spread
    } = ObjectAssign({ __proto__: null }, providedOptions) as BrowserEnvironmentOptions;
    const iframe = createDetachableIframe(blueRefs.document);
    const redWindow: GlobalObject = ReflectApply(
        HTMLIFrameElementProtoContentWindowGetter,
        iframe,
        []
    )!;
    const shouldUseDefaultGlobalOwnKeys =
        typeof globalObjectShape !== 'object' || globalObjectShape === null;
    if (shouldUseDefaultGlobalOwnKeys && defaultGlobalOwnKeys === null) {
        defaultGlobalOwnKeys = filterWindowKeys(getFilteredGlobalOwnKeys(redWindow));
    }
    let blueConnector = blueCreateHooksCallbackCache.get(blueRefs.document) as
        | Connector
        | undefined;
    if (blueConnector === undefined) {
        blueConnector = createBlueConnector(globalObject);
        blueCreateHooksCallbackCache.set(blueRefs.document, blueConnector);
    }
    // Install default TrustedTypes policy in the virtual environment.
    // @ts-ignore trustedTypes does not exist on GlobalObject
    if (typeof redWindow.trustedTypes !== 'undefined' && isObject(defaultPolicy)) {
        // @ts-ignore trustedTypes does not exist on GlobalObject
        redWindow.trustedTypes.createPolicy('default', defaultPolicy);
    }
    const { eval: redIndirectEval } = redWindow;
    const env = new VirtualEnvironment({
        blueConnector,
        redConnector: createRedConnector(
            signSourceCallback
                ? (sourceText: string) => redIndirectEval(signSourceCallback(sourceText))
                : redIndirectEval
        ),
        distortionCallback,
        instrumentation,
        liveTargetCallback,
        revokedProxyCallback: keepAlive ? revokedProxyCallback : undefined,
        signSourceCallback,
    });
    linkIntrinsics(env, globalObject);
    // window
    // window.document
    // In browsers globalThis is === window.
    if (typeof globalThis === 'undefined') {
        // Support for globalThis was added in Chrome 71.
        // However, environments like Android emulators are running Chrome 69.
        env.link('window', 'document');
    } else {
        // document is === window.document.
        env.link('document');
    }
    // window.__proto__ (aka Window.prototype)
    // window.__proto__.__proto__ (aka WindowProperties.prototype)
    // window.__proto__.__proto__.__proto__ (aka EventTarget.prototype)
    env.link('__proto__', '__proto__', '__proto__');
    env.remapProto(blueRefs.document, blueRefs.DocumentProto);
    env.lazyRemapProperties(
        blueRefs.window,
        shouldUseDefaultGlobalOwnKeys
            ? (defaultGlobalOwnKeys as PropertyKey[])
            : filterWindowKeys(getFilteredGlobalOwnKeys(globalObjectShape)),
        // Chromium based browsers have a bug that nulls the result of `window`
        // getters in detached iframes when the property descriptor of `window.window`
        // is retrieved.
        // https://bugs.chromium.org/p/chromium/issues/detail?id=1305302
        keepAlive ? undefined : unforgeablePoisonedWindowKeys
    );
    if (endowments) {
        const filteredEndowments: PropertyDescriptorMap = {};
        assignFilteredGlobalDescriptorsFromPropertyDescriptorMap(filteredEndowments, endowments);
        removeWindowDescriptors(filteredEndowments);
        env.remapProperties(blueRefs.window, filteredEndowments);
    }
    // We intentionally skip remapping Window.prototype because there is nothing
    // in it that needs to be remapped.
    env.lazyRemapProperties(blueRefs.EventTargetProto, blueRefs.EventTargetProtoOwnKeys);
    // We don't remap `blueRefs.WindowPropertiesProto` because it is "magical"
    // in that it provides access to elements by id.
    //
    // Once we get the iframe info ready, and all mapped, we can proceed to
    // detach the iframe only if `options.keepAlive` isn't true.
    if (keepAlive) {
        // @TODO: Temporary hack to preserve the document reference in Firefox.
        // https://bugzilla.mozilla.org/show_bug.cgi?id=543435
        const { document: redDocument } = redWindow;
        // Revoke the proxies of the redDocument and redWindow to prevent access.
        revoked.add(redDocument);
        revoked.add(redWindow);
        ReflectApply(DocumentProtoOpen, redDocument, []);
        ReflectApply(DocumentProtoClose, redDocument, []);
    } else {
        if (IS_OLD_CHROMIUM_BROWSER) {
            // For Chromium < v86 browsers we evaluate the `window` object to
            // kickstart the realm so that `window` persists when the iframe is
            // removed from the document.
            redIndirectEval('window');
        }
        ReflectApply(ElementProtoRemove, iframe, []);
    }
    return env;
}

function revokedProxyCallback(value: ProxyTarget): boolean {
    return revoked.has(value as any);
}

export default createIframeVirtualEnvironment;
