import {
    assignFilteredGlobalDescriptorsFromPropertyDescriptorMap,
    CallableEvaluate,
    createBlueConnector,
    createRedConnector,
    getFilteredGlobalOwnKeys,
    linkIntrinsics,
    VirtualEnvironment,
} from '@locker/near-membrane-base';
import {
    ObjectAssign,
    ReflectApply,
    toSafeWeakMap,
    toSafeWeakSet,
    SUPPORTS_SHADOW_REALM,
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
import type { Connector } from '@locker/near-membrane-base/types';
import type { ProxyTarget } from '@locker/near-membrane-shared/types';
import type { GlobalObject } from '@locker/near-membrane-shared-dom/types';
import type { BrowserEnvironmentOptions } from './types';
import {
    getCachedGlobalObjectReferences,
    filterWindowKeys,
    removeWindowDescriptors,
    unforgeablePoisonedWindowKeys,
} from './window';

const IFRAME_SANDBOX_ATTRIBUTE_VALUE = 'allow-same-origin allow-scripts';

const aliveIframes = toSafeWeakSet(new WeakSetCtor<HTMLIFrameElement>());
const blueCreateHooksCallbackCache = toSafeWeakMap(new WeakMapCtor<Document, Connector>());

let defaultGlobalOwnKeys: PropertyKey[] | null = null;
const defaultGlobalOwnKeysRegistry = ObjectAssign({ __proto__: null });
let defaultGlobalPropertyDescriptorMap: PropertyDescriptorMap | null = null;

const ObjectCtor = Object;
const { bind: FunctionProtoBind } = Function.prototype;
const { create: ObjectCreate, getOwnPropertyDescriptors: ObjectGetOwnPropertyDescriptors } =
    ObjectCtor;

// @ts-ignore: Prevent cannot find name 'ShadowRealm' error.
const ShadowRealmCtor = SUPPORTS_SHADOW_REALM ? ShadowRealm : undefined;
const ShadowRealmProtoEvaluate: CallableEvaluate | undefined = ShadowRealmCtor?.prototype?.evaluate;

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
    const blueRefs = getCachedGlobalObjectReferences(globalObject)!;
    if (typeof blueRefs !== 'object' || blueRefs === null) {
        throw new TypeErrorCtor('Invalid virtualization target.');
    }
    const {
        distortionCallback,
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
    env.installRemapOverrides();
    // We don't remap `blueRefs.WindowPropertiesProto` because it is "magical"
    // in that it provides access to elements by id.
    //
    // Once we get the iframe info ready, and all mapped, we can proceed to
    // detach the iframe only if `options.keepAlive` isn't true.
    if (keepAlive) {
        aliveIframes.add(iframe);
        // @TODO: Temporary hack to preserve the document reference in Firefox.
        // https://bugzilla.mozilla.org/show_bug.cgi?id=543435
        const { document: redDocument } = redWindow;
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
    return aliveIframes.has(value as any);
}

function createShadowRealmVirtualEnvironment(
    globalObject: WindowProxy & typeof globalThis,
    globalObjectShape: object | null,
    providedOptions?: BrowserEnvironmentOptions
): VirtualEnvironment {
    if (typeof globalObject !== 'object' || globalObject === null) {
        throw new TypeErrorCtor('Missing global object virtualization target.');
    }
    const {
        distortionCallback,
        endowments,
        instrumentation,
        // eslint-disable-next-line prefer-object-spread
    } = ObjectAssign({ __proto__: null }, providedOptions);

    // If a globalObjectShape has been explicitly specified, reset the
    // defaultGlobalPropertyDescriptorMap to null. This will ensure that
    // the provided globalObjectShape is used to re-create the cached
    // defaultGlobalPropertyDescriptorMap.
    if (globalObjectShape !== null) {
        defaultGlobalPropertyDescriptorMap = null;
    }
    if (defaultGlobalPropertyDescriptorMap === null) {
        let sourceShapeOrOneTimeWindow = globalObjectShape!;
        let sourceIsIframe = false;
        if (globalObjectShape === null) {
            const oneTimeIframe = createDetachableIframe(globalObject.document);
            sourceShapeOrOneTimeWindow = ReflectApply(
                HTMLIFrameElementProtoContentWindowGetter,
                oneTimeIframe,
                []
            )!;
            sourceIsIframe = true;
        }
        defaultGlobalOwnKeys = getFilteredGlobalOwnKeys(sourceShapeOrOneTimeWindow);
        if (sourceIsIframe) {
            ReflectApply(ElementProtoRemove, sourceShapeOrOneTimeWindow, []);
        }
        defaultGlobalPropertyDescriptorMap = {
            __proto__: null,
        } as unknown as PropertyDescriptorMap;
        assignFilteredGlobalDescriptorsFromPropertyDescriptorMap(
            defaultGlobalPropertyDescriptorMap,
            ObjectGetOwnPropertyDescriptors(globalObject)
        );
        for (let i = 0, { length } = defaultGlobalOwnKeys; i < length; i += 1) {
            defaultGlobalOwnKeysRegistry[defaultGlobalOwnKeys[i]] = true;
        }
        for (const key in defaultGlobalPropertyDescriptorMap) {
            if (!(key in defaultGlobalOwnKeysRegistry)) {
                delete defaultGlobalPropertyDescriptorMap[key];
            }
        }
    }
    const blueRefs = getCachedGlobalObjectReferences(globalObject)!;
    // Create a new environment.
    const env = new VirtualEnvironment({
        blueConnector: createBlueConnector(globalObject),
        distortionCallback,
        instrumentation,
        redConnector: createRedConnector(
            ReflectApply(FunctionProtoBind, ShadowRealmProtoEvaluate, [new ShadowRealmCtor()])
        ),
    });
    linkIntrinsics(env, globalObject);
    // window
    env.link('globalThis');
    // Set globalThis.__proto__ in the sandbox to a proxy of
    // globalObject.__proto__ and with this, the entire
    // structure around window proto chain should be covered.
    env.remapProto(globalObject, blueRefs.WindowProto);
    let unsafeBlueDescMap: PropertyDescriptorMap = defaultGlobalPropertyDescriptorMap;
    if (globalObject !== window) {
        unsafeBlueDescMap = { __proto__: null } as unknown as PropertyDescriptorMap;
        assignFilteredGlobalDescriptorsFromPropertyDescriptorMap(
            unsafeBlueDescMap,
            ObjectGetOwnPropertyDescriptors(globalObject)
        );
        for (const key in unsafeBlueDescMap) {
            if (!(key in defaultGlobalOwnKeysRegistry)) {
                delete unsafeBlueDescMap[key];
            }
        }
    }
    env.remapProperties(blueRefs.window, unsafeBlueDescMap);
    if (endowments) {
        const filteredEndowments: PropertyDescriptorMap = {};
        assignFilteredGlobalDescriptorsFromPropertyDescriptorMap(filteredEndowments, endowments);
        removeWindowDescriptors(filteredEndowments);
        env.remapProperties(blueRefs.window, filteredEndowments);
    }
    // We remap `blueRefs.WindowPropertiesProto` to an empty object because it
    // is "magical" in that it provides access to elements by id.
    env.remapProto(blueRefs.WindowProto, ObjectCreate(blueRefs.EventTargetProto));
    return env;
}

export default SUPPORTS_SHADOW_REALM
    ? createShadowRealmVirtualEnvironment
    : createIframeVirtualEnvironment;
