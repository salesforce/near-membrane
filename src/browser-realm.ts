import { SecureEnvironment, SecureProxyTarget } from "./environment";
import { getPrototypeOf, setPrototypeOf, getOwnPropertyDescriptors } from "./shared";

const unsafeGlobalSrc = "'use strict'; this";

export default function createSecureEnvironment(distortionCallback: (target: SecureProxyTarget) => SecureProxyTarget) {
    // @ts-ignore document global ref - in browsers
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';

    // @ts-ignore document global ref - in browsers
    document.body.appendChild(iframe);
    // We need to keep the iframe attached to the DOM because removing it
    // causes its global object to lose intrinsics, its eval()
    // function to evaluate code, etc.

    // window -> Window -> WindowProperties -> EventTarget
    const secureGlobalThis = iframe.contentWindow.eval(unsafeGlobalSrc);
    const secureDocument = secureGlobalThis.document;
    const secureWindowProto = getPrototypeOf(secureGlobalThis);
    const secureWindowPropertiesProto = getPrototypeOf(secureWindowProto);
    const secureEventTargetProto = getPrototypeOf(secureWindowPropertiesProto);

    const rawGlobalThis = globalThis as any;
    const rawDocument = rawGlobalThis.document;
    const rawDocumentProto = getPrototypeOf(rawDocument);
    const rawWindowProto = getPrototypeOf(rawGlobalThis);
    const rawWindowPropertiesProto = getPrototypeOf(rawWindowProto);
    const rawEventTargetProto = getPrototypeOf(rawWindowPropertiesProto);

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
    setPrototypeOf(secureDocument, env.getSecureValue(rawDocumentProto));

    // remapping window proto chain backward
    env.remap(secureEventTargetProto, rawEventTargetProto, rawEventTargetProtoDescriptors);
    env.remap(secureWindowPropertiesProto, rawWindowPropertiesProto, rawWindowPropertiesProtoDescriptors);
    env.remap(secureWindowProto, rawWindowProto, rawWindowProtoDescriptors);
    env.remap(secureGlobalThis, rawGlobalThis, rawGlobalThisDescriptors);

    return secureGlobalThis;
}
