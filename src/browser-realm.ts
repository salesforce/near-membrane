import { SecureEnvironment, SecureProxyTarget } from "./environment";
import { 
    ReflectGetPrototypeOf, 
    ReflectSetPrototypeOf, 
    getOwnPropertyDescriptors,
    getGlobalThis
} from "./shared";

const unsafeGlobalSrc = "'use strict'; this";

export default function createSecureEnvironment(distortionCallback: (target: SecureProxyTarget) => SecureProxyTarget) {
    // @ts-ignore document global ref - in browsers
    const iframe = document.createElement('iframe');
    iframe.sandbox = 'allow-same-origin allow-scripts';
    iframe.style.display = 'none';

    // @ts-ignore document global ref - in browsers
    document.body.appendChild(iframe);

    // For Chrome we evaluate the `window` object to kickstart the realm so that
    // `window` persists when the iframe is removed from the document.
    const { contentWindow } = iframe;
    contentWindow.eval('window');

    // In Chrome debugger statements will be ignored when the iframe is removed
    // from the document. Other browsers like Firefox and Safari work as expected.
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1015462
    iframe.remove();

    // window -> Window -> WindowProperties -> EventTarget
    const secureGlobalThis = contentWindow.eval(unsafeGlobalSrc);
    const secureDocument = secureGlobalThis.document;
    const secureWindowProto = ReflectGetPrototypeOf(secureGlobalThis);
    const secureWindowPropertiesProto = ReflectGetPrototypeOf(secureWindowProto);
    const secureEventTargetProto = ReflectGetPrototypeOf(secureWindowPropertiesProto);

    const rawGlobalThis = getGlobalThis();
    const rawDocument = rawGlobalThis.document;
    const rawDocumentProto = ReflectGetPrototypeOf(rawDocument);
    const rawWindowProto = ReflectGetPrototypeOf(rawGlobalThis);
    const rawWindowPropertiesProto = ReflectGetPrototypeOf(rawWindowProto);
    const rawEventTargetProto = ReflectGetPrototypeOf(rawWindowPropertiesProto);

    const rawGlobalThisDescriptors = getOwnPropertyDescriptors(rawGlobalThis);
    const rawWindowProtoDescriptors = getOwnPropertyDescriptors(rawWindowProto);
    const rawWindowPropertiesProtoDescriptors = getOwnPropertyDescriptors(rawWindowPropertiesProto);
    const rawEventTargetProtoDescriptors = getOwnPropertyDescriptors(rawEventTargetProto);

    // removing problematic descriptors that should never be installed
    delete rawGlobalThisDescriptors.location;
    delete rawGlobalThisDescriptors.EventTarget;
    delete rawGlobalThisDescriptors.document;
    delete rawGlobalThisDescriptors.window;

    const env = new SecureEnvironment({
        rawGlobalThis,
        secureGlobalThis,
        distortionCallback,
    });

    // other maps
    env.remap(secureDocument, rawDocument, {/* it only has location, which is ignored for now */});
    ReflectSetPrototypeOf(secureDocument, env.getSecureValue(rawDocumentProto));

    // remapping window proto chain backward
    env.remap(secureEventTargetProto, rawEventTargetProto, rawEventTargetProtoDescriptors);
    env.remap(secureWindowPropertiesProto, rawWindowPropertiesProto, rawWindowPropertiesProtoDescriptors);
    env.remap(secureWindowProto, rawWindowProto, rawWindowProtoDescriptors);
    env.remap(secureGlobalThis, rawGlobalThis, rawGlobalThisDescriptors);

    return secureGlobalThis;
}
