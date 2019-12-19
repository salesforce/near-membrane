import { SecureEnvironment } from "./environment";
import { SecureProxyTarget } from "./membrane";
import { 
    ReflectGetPrototypeOf, 
    ReflectSetPrototypeOf, 
    getOwnPropertyDescriptors,
} from "./shared";

// caching references to object values that can't be replaced
// window -> Window -> WindowProperties -> EventTarget
const rawWindow = globalThis.window;
const rawDocument = globalThis.document;
const rawWindowProto = ReflectGetPrototypeOf(rawWindow);
const rawWindowPropertiesProto = ReflectGetPrototypeOf(rawWindowProto);
const rawEventTargetProto = ReflectGetPrototypeOf(rawWindowPropertiesProto);

export default function createSecureEnvironment(distortionCallback: (target: SecureProxyTarget) => SecureProxyTarget): Window & typeof globalThis {
    // @ts-ignore document global ref - in browsers
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts');
    iframe.style.display = 'none';

    // @ts-ignore document global ref - in browsers
    document.body.appendChild(iframe);

    // For Chrome we evaluate the `window` object to kickstart the realm so that
    // `window` persists when the iframe is removed from the document.
    const secureWindow = (iframe.contentWindow as WindowProxy).window;
    secureWindow.eval('window');

    // In Chrome debugger statements will be ignored when the iframe is removed
    // from the document. Other browsers like Firefox and Safari work as expected.
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1015462
    iframe.remove();

    // window -> Window -> WindowProperties -> EventTarget
    const secureDocument = secureWindow.document;
    const secureWindowProto = ReflectGetPrototypeOf(secureWindow);
    const secureWindowPropertiesProto = ReflectGetPrototypeOf(secureWindowProto);
    const secureEventTargetProto = ReflectGetPrototypeOf(secureWindowPropertiesProto);

    const rawDocumentProto = ReflectGetPrototypeOf(rawDocument);
    const rawGlobalThisDescriptors = getOwnPropertyDescriptors(rawWindow) as PropertyDescriptorMap;
    const rawWindowProtoDescriptors = getOwnPropertyDescriptors(rawWindowProto);
    const rawWindowPropertiesProtoDescriptors = getOwnPropertyDescriptors(rawWindowPropertiesProto);
    const rawEventTargetProtoDescriptors = getOwnPropertyDescriptors(rawEventTargetProto);

    // removing problematic descriptors that should never be installed
    delete rawGlobalThisDescriptors.location;
    delete rawGlobalThisDescriptors.EventTarget;
    delete rawGlobalThisDescriptors.document;
    delete rawGlobalThisDescriptors.window;

    const env = new SecureEnvironment({
        rawGlobalThis: rawWindow,
        secureGlobalThis: secureWindow,
        distortionCallback,
    });

    // other maps
    env.remap(secureDocument, rawDocument, {/* it only has location, which is ignored for now */});
    ReflectSetPrototypeOf(secureDocument, env.getSecureValue(rawDocumentProto));

    // remapping window proto chain backward
    env.remap(secureEventTargetProto, rawEventTargetProto, rawEventTargetProtoDescriptors);
    env.remap(secureWindowPropertiesProto, rawWindowPropertiesProto, rawWindowPropertiesProtoDescriptors);
    env.remap(secureWindowProto, rawWindowProto, rawWindowProtoDescriptors);
    env.remap(secureWindow, rawWindow, rawGlobalThisDescriptors);

    return secureWindow;
}
