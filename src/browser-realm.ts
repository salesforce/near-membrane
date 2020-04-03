import { SecureEnvironment } from "./environment";
import { RedProxyTarget, BlueFunction } from "./types";
import {
    ReflectGetPrototypeOf,
    ReflectSetPrototypeOf,
    getOwnPropertyDescriptors,
    construct,
    ErrorCreate,
} from "./shared";

// caching references to object values that can't be replaced
// window -> Window -> WindowProperties -> EventTarget
const blueWindow = globalThis.window;
const blueDocument = globalThis.document;
const blueWindowProto = ReflectGetPrototypeOf(blueWindow);
const blueWindowPropertiesProto = ReflectGetPrototypeOf(blueWindowProto);
const blueEventTargetProto = ReflectGetPrototypeOf(blueWindowPropertiesProto);

// A comprehensive list of policy feature directives can be found at
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy#Directives
// Directives not currently supported by Chrome are commented out because
// Chrome logs warnings to the developer console.
const IFRAME_ALLOW_ATTRIBUTE_VALUE =
    "accelerometer 'none';" +
    "ambient-light-sensor 'none';" +
    "autoplay 'none';" +
    // "battery 'none';" +
    "camera 'none';" +
    // "display-capture 'none';" +
    "document-domain 'none';" +
    "encrypted-media 'none';" +
    // "execution-while-not-rendered 'none';" +
    // "execution-while-out-of-viewport 'none';" +
    "fullscreen 'none';" +
    "geolocation 'none';" +
    "gyroscope 'none';" +
    // "layout-animations 'none';" +
    // "legacy-image-formats 'none';" +
    "magnetometer 'none';" +
    "microphone 'none';" +
    "midi 'none';" +
    // "navigation-override 'none';" +
    // "oversized-images 'none';" +
    "payment 'none';" +
    "picture-in-picture 'none';" +
    // "publickey-credentials 'none';" +
    "sync-xhr 'none';" +
    "usb 'none';" +
    // "wake-lock 'none';" +
    "xr-spatial-tracking 'none';"

const IFRAME_SANDBOX_ATTRIBUTE_VALUE = 'allow-same-origin allow-scripts';

export default function createSecureEnvironment(distortionMap?: Map<RedProxyTarget, RedProxyTarget>): (sourceText: string) => void {
    // @ts-ignore document global ref - in browsers
    const iframe = document.createElement('iframe');
    iframe.setAttribute('allow', IFRAME_ALLOW_ATTRIBUTE_VALUE);
    iframe.setAttribute('sandbox', IFRAME_SANDBOX_ATTRIBUTE_VALUE);
    iframe.style.display = 'none';

    // @ts-ignore document global ref - in browsers
    document.body.appendChild(iframe);

    // For Chrome we evaluate the `window` object to kickstart the realm so that
    // `window` persists when the iframe is removed from the document.
    const redWindow = (iframe.contentWindow as WindowProxy).window;
    const { eval: redIndirectEval } = redWindow;
    redIndirectEval('window');

    // In Chrome debugger statements will be ignored when the iframe is removed
    // from the document. Other browsers like Firefox and Safari work as expected.
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1015462
    iframe.remove();

    // window -> Window -> WindowProperties -> EventTarget
    const redDocument = redWindow.document;
    const redWindowProto = ReflectGetPrototypeOf(redWindow);
    const redWindowPropertiesProto = ReflectGetPrototypeOf(redWindowProto);
    const redEventTargetProto = ReflectGetPrototypeOf(redWindowPropertiesProto);

    const blueDocumentProto = ReflectGetPrototypeOf(blueDocument);
    const blueGlobalThisDescriptors = getOwnPropertyDescriptors(blueWindow) as PropertyDescriptorMap;
    const blueWindowProtoDescriptors = getOwnPropertyDescriptors(blueWindowProto);
    const blueWindowPropertiesProtoDescriptors = getOwnPropertyDescriptors(blueWindowPropertiesProto);
    const blueEventTargetProtoDescriptors = getOwnPropertyDescriptors(blueEventTargetProto);

    // removing problematic descriptors that should never be installed
    delete blueGlobalThisDescriptors.location;
    delete blueGlobalThisDescriptors.EventTarget;
    delete blueGlobalThisDescriptors.document;
    delete blueGlobalThisDescriptors.window;

    // Some DOM APIs do brand checks for TypeArrays and others objects,
    // in this case, if the API is not dangerous, and works in a detached
    // iframe, we can let the sandbox to use the iframe's api directly,
    // instead of remapping it to the blue realm.
    // TODO [issue #67]: review this list
    delete blueGlobalThisDescriptors.crypto;

    const env = new SecureEnvironment({
        blueGlobalThis: blueWindow,
        redGlobalThis: redWindow,
        distortionMap,
    });

    // other maps
    env.remap(redDocument, blueDocument, {/* it only has location, which is ignored for now */});
    ReflectSetPrototypeOf(redDocument, env.getRedValue(blueDocumentProto));

    // remapping window proto chain backward
    env.remap(redEventTargetProto, blueEventTargetProto, blueEventTargetProtoDescriptors);
    env.remap(redWindowPropertiesProto, blueWindowPropertiesProto, blueWindowPropertiesProtoDescriptors);
    env.remap(redWindowProto, blueWindowProto, blueWindowProtoDescriptors);
    env.remap(redWindow, blueWindow, blueGlobalThisDescriptors);

    // finally, we return the evaluator function
    return (sourceText: string): void => {
        try {
            redIndirectEval(sourceText);
        } catch (e) {
            // This error occurred when the blue realm attempts to evaluate a
            // sourceText into the sandbox. By throwing a new blue error, which
            // eliminates the stack information from the sandbox as a consequence.
            let blueError;
            const { message, constructor } = e;
            try {
                const blueErrorConstructor = env.getBlueRef(constructor);
                // the constructor must be registered (done during construction of env)
                // otherwise we need to fallback to a regular error.
                blueError = construct(blueErrorConstructor as BlueFunction, [message]);
            } catch {
                // in case the constructor inference fails
                blueError = ErrorCreate(message);
            }
            throw blueError;
        }
    };
}
