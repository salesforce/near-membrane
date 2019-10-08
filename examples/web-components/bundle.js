'use strict';

const { isArray } = Array;
const { create: ObjectCreate, getOwnPropertyDescriptors, getOwnPropertyNames, getOwnPropertySymbols, freeze, } = Object;
const { apply, construct, getPrototypeOf, setPrototypeOf, defineProperty: ObjectDefineProperty, isExtensible, getOwnPropertyDescriptor, preventExtensions, } = Reflect;
const hasOwnProperty = unapply(Object.prototype.hasOwnProperty);
const map = unapply(Array.prototype.map);
function unapply(func) {
    return (thisArg, ...args) => apply(func, thisArg, args);
}
function isUndefined(obj) {
    return obj === undefined;
}
function isTrue(obj) {
    return obj === true;
}
function isFunction(obj) {
    return typeof obj === 'function';
}
const emptyArray = [];
const ESGlobalKeys = new Set([
    // *** 18.1 Value Properties of the Global Object
    'Infinity',
    'NaN',
    'undefined',
    // *** 18.2 Function Properties of the Global Object
    'eval',
    'isFinite',
    'isNaN',
    'parseFloat',
    'parseInt',
    'decodeURI',
    'decodeURIComponent',
    'encodeURI',
    'encodeURIComponent',
    // *** 18.3 Constructor Properties of the Global Object
    'Array',
    'ArrayBuffer',
    'Boolean',
    'DataView',
    'Date',
    'Error',
    'EvalError',
    'Float32Array',
    'Float64Array',
    'Function',
    'Int8Array',
    'Int16Array',
    'Int32Array',
    'Map',
    'Number',
    'Object',
    'Promise',
    'Proxy',
    'RangeError',
    'ReferenceError',
    'RegExp',
    'Set',
    // 'SharedArrayBuffer', // removed on Jan 5, 2018
    'String',
    'Symbol',
    'SyntaxError',
    'TypeError',
    'Uint8Array',
    'Uint8ClampedArray',
    'Uint16Array',
    'Uint32Array',
    'URIError',
    'WeakMap',
    'WeakSet',
    // *** 18.4 Other Properties of the Global Object
    // 'Atomics', // removed on Jan 5, 2018
    'JSON',
    'Math',
    'Reflect',
    // *** Annex B
    'escape',
    'unescape',
    // *** ECMA-402
    'Intl',
]);
// Variation of the polyfill described here:
// https://mathiasbynens.be/notes/globalthis
// Note: we don't polyfill it, just use it.
// Note: we don't cache it, to accommodate jest for now
function getGlobalThis() {
    if (typeof globalThis === 'object') {
        return globalThis;
    }
    // @ts-ignore funky stuff to get the global reference in all environments
    Object.prototype.__defineGetter__('__magic__', function () {
        return this;
    });
    // @ts-ignore
    const gt = __magic__;
    delete Object.prototype.__magic__;
    return gt;
}

function getSecureDescriptor(descriptor, env) {
    const { value, get, set, writable } = descriptor;
    if (isUndefined(writable)) {
        // we are dealing with accessors
        if (!isUndefined(set)) {
            descriptor.set = env.getSecureFunction(set);
        }
        if (!isUndefined(get)) {
            descriptor.get = env.getSecureFunction(get);
        }
    }
    else {
        descriptor.value = isFunction(value) ?
            // we are dealing with a method (optimization)
            env.getSecureFunction(value) : env.getSecureValue(value);
    }
    return descriptor;
}
// equivalent to Object.getOwnPropertyDescriptor, but looks into the whole proto chain
function getPropertyDescriptor(o, p) {
    do {
        const d = getOwnPropertyDescriptor(o, p);
        if (!isUndefined(d)) {
            return d;
        }
        o = getPrototypeOf(o);
    } while (o !== null);
    return undefined;
}
function copySecureOwnDescriptors(env, shadowTarget, target) {
    // TODO: typescript definition for getOwnPropertyDescriptors is wrong, it should include symbols
    const descriptors = getOwnPropertyDescriptors(target);
    for (const key in descriptors) {
        // avoid poisoning by checking own properties from descriptors
        if (hasOwnProperty(descriptors, key)) {
            let originalDescriptor = descriptors[key];
            originalDescriptor = getSecureDescriptor(originalDescriptor, env);
            const shadowTargetDescriptor = getOwnPropertyDescriptor(shadowTarget, key);
            if (!isUndefined(shadowTargetDescriptor)) {
                if (isTrue(shadowTargetDescriptor.configurable)) {
                    ObjectDefineProperty(shadowTarget, key, originalDescriptor);
                }
                else if (isTrue(shadowTargetDescriptor.writable)) {
                    // just in case
                    shadowTarget[key] = originalDescriptor.value;
                }
            }
            else {
                ObjectDefineProperty(shadowTarget, key, originalDescriptor);
            }
        }
    }
}
const noop = () => undefined;
/**
 * identity preserved through this membrane:
 *  - symbols
 */
class SecureProxyHandler {
    constructor(env, target) {
        this.target = target;
        this.env = env;
    }
    // initialization used to avoid the initialization cost
    // of an object graph, we want to do it when the
    // first interaction happens.
    initialize(shadowTarget) {
        const { target, env } = this;
        // adjusting the proto chain of the shadowTarget (recursively)
        const rawProto = getPrototypeOf(target);
        setPrototypeOf(shadowTarget, env.getSecureValue(rawProto));
        // defining own descriptors
        copySecureOwnDescriptors(env, shadowTarget, target);
        // once the initialization is executed once... the rest is just noop 
        this.initialize = noop;
        // future optimization: hoping that proxies with frozen handlers can be faster
        freeze(this);
    }
    get(shadowTarget, key, receiver) {
        this.initialize(shadowTarget);
        const desc = getPropertyDescriptor(shadowTarget, key);
        if (isUndefined(desc)) {
            return desc;
        }
        const { get } = desc;
        if (!isUndefined(get)) {
            return apply(get, receiver, emptyArray);
        }
        return desc.value;
    }
    set(shadowTarget, key, value, receiver) {
        this.initialize(shadowTarget);
        const desc = getPropertyDescriptor(shadowTarget, key);
        if (isUndefined(desc)) {
            if (isExtensible(shadowTarget)) {
                // it should be a descriptor installed on the current shadowTarget
                ObjectDefineProperty(shadowTarget, key, {
                    value,
                    configurable: true,
                    enumerable: true,
                    writable: true,
                });
            }
            else {
                // non-extensible should throw in strict mode
                // TypeError: Cannot add property ${key}, object is not extensible
                return false;
            }
        }
        else {
            // descriptor exists in the shadowRoot or proto chain
            const { set, get, writable } = desc;
            if (writable === false) {
                // TypeError: Cannot assign to read only property '${key}' of object
                return false;
            }
            else if (!isUndefined(set)) {
                // a setter is available, just call it:
                apply(set, receiver, [value]);
            }
            else if (!isUndefined(get)) {
                // a getter without a setter should fail to set in strict mode
                // TypeError: Cannot set property ${key} of object which has only a getter
                return false;
            }
            else {
                // the descriptor is writable, just assign it
                shadowTarget[key] = value;
            }
        }
        return true;
    }
    deleteProperty(shadowTarget, key) {
        this.initialize(shadowTarget);
        delete shadowTarget[key];
        return true;
    }
    apply(shadowTarget, thisArg, argArray) {
        const { target, env } = this;
        this.initialize(shadowTarget);
        const rawThisArg = env.getRawValue(thisArg);
        const rawArgArray = env.getRawArray(argArray);
        const raw = apply(target, rawThisArg, rawArgArray);
        return env.getSecureValue(raw);
    }
    construct(shadowTarget, argArray, newTarget) {
        const { target: RawCtor, env } = this;
        this.initialize(shadowTarget);
        if (newTarget === undefined) {
            throw TypeError();
        }
        const rawArgArray = env.getRawArray(argArray);
        const rawNewTarget = env.getRawValue(newTarget);
        const raw = construct(RawCtor, rawArgArray, rawNewTarget);
        const sec = env.getSecureValue(raw);
        return sec;
    }
    has(shadowTarget, key) {
        this.initialize(shadowTarget);
        return key in shadowTarget;
    }
    ownKeys(shadowTarget) {
        this.initialize(shadowTarget);
        // TODO: this is leaking outer realm's array
        return [
            ...getOwnPropertyNames(shadowTarget),
            ...getOwnPropertySymbols(shadowTarget),
        ];
    }
    isExtensible(shadowTarget) {
        this.initialize(shadowTarget);
        // No DOM API is non-extensible, but in the sandbox, the author
        // might want to make them non-extensible
        return isExtensible(shadowTarget);
    }
    getOwnPropertyDescriptor(shadowTarget, key) {
        this.initialize(shadowTarget);
        // TODO: this is leaking outer realm's object
        return getOwnPropertyDescriptor(shadowTarget, key);
    }
    getPrototypeOf(shadowTarget) {
        this.initialize(shadowTarget);
        // nothing to be done here since the shadowTarget must have the right proto chain
        return getPrototypeOf(shadowTarget);
    }
    setPrototypeOf(shadowTarget, prototype) {
        this.initialize(shadowTarget);
        // this operation can only affect the env object graph
        setPrototypeOf(shadowTarget, prototype);
        return true;
    }
    preventExtensions(shadowTarget) {
        // this operation can only affect the env object graph
        this.initialize(shadowTarget);
        preventExtensions(shadowTarget);
        return true;
    }
    defineProperty(shadowTarget, key, descriptor) {
        this.initialize(shadowTarget);
        // this operation can only affect the env object graph
        ObjectDefineProperty(shadowTarget, key, descriptor);
        return true;
    }
}

function getReverseDescriptor(descriptor, env) {
    const { value, get, set, writable } = descriptor;
    if (isUndefined(writable)) {
        // we are dealing with accessors
        if (!isUndefined(set)) {
            descriptor.set = env.getRawFunction(set);
        }
        if (!isUndefined(get)) {
            descriptor.get = env.getRawFunction(get);
        }
        return descriptor;
    }
    else {
        // we are dealing with a value descriptor
        descriptor.value = isFunction(value) ?
            // we are dealing with a method (optimization)
            env.getRawFunction(value) : env.getRawValue(value);
    }
    return descriptor;
}
function copyReverseOwnDescriptors(env, shadowTarget, target) {
    // TODO: typescript definition for getOwnPropertyDescriptors is wrong, it should include symbols
    const descriptors = getOwnPropertyDescriptors(target);
    for (const key in descriptors) {
        // avoid poisoning by checking own properties from descriptors
        if (hasOwnProperty(descriptors, key)) {
            let originalDescriptor = descriptors[key];
            originalDescriptor = getReverseDescriptor(originalDescriptor, env);
            const shadowTargetDescriptor = getOwnPropertyDescriptor(shadowTarget, key);
            if (!isUndefined(shadowTargetDescriptor)) {
                if (isTrue(shadowTargetDescriptor.configurable)) {
                    ObjectDefineProperty(shadowTarget, key, originalDescriptor);
                }
                else if (isTrue(shadowTargetDescriptor.writable)) {
                    // just in case
                    shadowTarget[key] = originalDescriptor.value;
                }
            }
            else {
                ObjectDefineProperty(shadowTarget, key, originalDescriptor);
            }
        }
    }
}
/**
 * identity preserved through this membrane:
 *  - symbols
 */
class ReverseProxyHandler {
    constructor(env, target) {
        this.target = target;
        this.env = env;
    }
    initialize(shadowTarget) {
        const { target, env } = this;
        // adjusting the proto chain of the shadowTarget (recursively)
        const secureProto = getPrototypeOf(target);
        setPrototypeOf(shadowTarget, env.getRawValue(secureProto));
        // defining own descriptors
        copyReverseOwnDescriptors(env, shadowTarget, target);
        // future optimization: hoping that proxies with frozen handlers can be faster
        freeze(this);
    }
    apply(shadowTarget, thisArg, argArray) {
        const { target, env } = this;
        const secThisArg = env.getSecureValue(thisArg);
        const secArgArray = env.getSecureArray(argArray);
        const sec = apply(target, secThisArg, secArgArray);
        return env.getRawValue(sec);
    }
    construct(shadowTarget, argArray, newTarget) {
        const { target: SecCtor, env } = this;
        if (newTarget === undefined) {
            throw TypeError();
        }
        const secArgArray = env.getSecureArray(argArray);
        // const secNewTarget = env.getSecureValue(newTarget);
        const sec = construct(SecCtor, secArgArray);
        const raw = env.getRawValue(sec);
        return raw;
    }
    has(shadowTarget, key) {
        return key in shadowTarget;
    }
    ownKeys(shadowTarget) {
        // TODO: avoid triggering the iterator protocol
        return [
            ...getOwnPropertyNames(shadowTarget),
            ...getOwnPropertySymbols(shadowTarget),
        ];
    }
    getOwnPropertyDescriptor(shadowTarget, key) {
        return getOwnPropertyDescriptor(shadowTarget, key);
    }
    getPrototypeOf(shadowTarget) {
        // nothing to be done here since the shadowTarget must have the right proto chain
        return getPrototypeOf(shadowTarget);
    }
    deleteProperty(shadowTarget, _key) {
        return false; // reverse proxies are immutable
    }
    isExtensible(shadowTarget) {
        return false; // reverse proxies are immutable
    }
    setPrototypeOf(shadowTarget, _prototype) {
        return false; // reverse proxies are immutable
    }
    preventExtensions(shadowTarget) {
        return false; // reverse proxies are immutable
    }
    defineProperty(shadowTarget, _key, _descriptor) {
        return false; // reverse proxies are immutable
    }
}

/**
 * This method returns a descriptor that given an original setter, and a getter, can use the original
 * getter to return a secure object, but if the sandbox attempts to set it to a new value, this
 * mutation will only affect the sandbox's global object, and the getter will start returning the
 * new provided value rather than calling onto the outer realm. This is to preserve the object graph
 * of the outer realm.
 */
function getSecureGlobalAccessorDescriptor(env, descriptor) {
    const { get: originalGetter } = descriptor;
    let currentGetter = isUndefined(originalGetter) ? () => undefined : function () {
        const value = apply(originalGetter, env.getRawValue(this), emptyArray);
        return env.getSecureValue(value);
    };
    if (!isUndefined(originalGetter)) {
        descriptor.get = function get() {
            return apply(currentGetter, this, emptyArray);
        };
    }
    descriptor.set = function set(v) {
        // if a global setter is invoke, the value will be use as it is as the result of the getter operation
        currentGetter = () => v;
    };
    return descriptor;
}
// it means it does have identity and should be proxified.
function isProxyTarget(o) {
    // hire-wired for the common case
    if (o == null) {
        return false;
    }
    const t = typeof o;
    return t === 'object' || t === 'function';
}
class SecureEnvironment {
    constructor(options) {
        // secure object map
        this.som = new WeakMap();
        // raw object map
        this.rom = new WeakMap();
        // distortion mechanism (default to noop)
        this.distortionCallback = t => t;
        if (isUndefined(options)) {
            throw new Error(`Missing SecureEnvironmentOptions options bag.`);
        }
        const { rawGlobalThis, secureGlobalThis, distortionCallback } = options;
        this.distortionCallback = distortionCallback;
        this.secureGlobalThis = secureGlobalThis;
        // These are foundational things that should never be wrapped but are equivalent
        // TODO: revisit this, is this really needed? what happen if Object.prototype is patched in the sec env?
        this.createSecureRecord(secureGlobalThis.Object, rawGlobalThis.Object);
        this.createSecureRecord(secureGlobalThis.Object.prototype, rawGlobalThis.Object.prototype);
        this.createSecureRecord(secureGlobalThis.Function, rawGlobalThis.Function);
        this.createSecureRecord(secureGlobalThis.Function.prototype, rawGlobalThis.Function.prototype);
    }
    createSecureShadowTarget(o) {
        let shadowTarget;
        if (isFunction(o)) {
            shadowTarget = function () { };
            ObjectDefineProperty(shadowTarget, 'name', {
                value: o.name,
                configurable: true,
            });
        }
        else {
            // o is object
            shadowTarget = {};
        }
        return shadowTarget;
    }
    createReverseShadowTarget(o) {
        let shadowTarget;
        if (isFunction(o)) {
            shadowTarget = function () { };
            ObjectDefineProperty(shadowTarget, 'name', {
                value: o.name,
                configurable: true,
            });
        }
        else {
            // o is object
            shadowTarget = {};
        }
        return shadowTarget;
    }
    createSecureProxy(raw) {
        const shadowTarget = this.createSecureShadowTarget(raw);
        const proxyHandler = new SecureProxyHandler(this, raw);
        const sec = new Proxy(shadowTarget, proxyHandler);
        this.createSecureRecord(sec, raw);
        return sec;
    }
    createReverseProxy(sec) {
        const shadowTarget = this.createReverseShadowTarget(sec);
        const proxyHandler = new ReverseProxyHandler(this, sec);
        const raw = new Proxy(shadowTarget, proxyHandler);
        this.createSecureRecord(sec, raw);
        // eager initialization of reverse proxies
        proxyHandler.initialize(shadowTarget);
        return raw;
    }
    createSecureRecord(sec, raw) {
        const sr = ObjectCreate(null);
        sr.raw = raw;
        sr.sec = sec;
        // double index for perf
        this.som.set(sec, sr);
        this.rom.set(raw, sr);
    }
    getDistortedValue(target) {
        const { distortionCallback } = this;
        if (isUndefined(distortionCallback)) {
            return target;
        }
        const distortedTarget = distortionCallback(target);
        if (!isProxyTarget(distortedTarget)) {
            throw new Error(`Invalid distortion mechanism.`);
        }
        return distortedTarget;
    }
    remap(secureValue, rawValue, rawDescriptors) {
        this.createSecureRecord(secureValue, rawValue);
        for (let key in rawDescriptors) {
            // TODO: this whole block needs cleanup and simplification
            // avoid overriding ecma script global keys.
            if (!ESGlobalKeys.has(key)) {
                const secureDescriptor = getOwnPropertyDescriptor(secureValue, key);
                if (hasOwnProperty(rawDescriptors, key)) {
                    // avoid poisoning to only installing own properties from baseDescriptors,
                    let rawDescriptor = rawDescriptors[key];
                    if (hasOwnProperty(rawDescriptor, 'set')) {
                        // setter, and probably getter branch
                        rawDescriptor = getSecureGlobalAccessorDescriptor(this, rawDescriptor);
                    }
                    else if (hasOwnProperty(rawDescriptor, 'get')) {
                        // getter only branch (e.g.: window.navigator)
                        const { get: originalGetter } = rawDescriptor;
                        const env = this;
                        rawDescriptor.get = function get() {
                            const value = apply(originalGetter, env.getRawValue(this), emptyArray);
                            return env.getSecureValue(value);
                        };
                    }
                    else {
                        // value branch
                        const { value: rawDescriptorValue } = rawDescriptor;
                        // TODO: maybe we should make everything a getter/setter that way
                        // we don't pay the cost of creating the proxy in the first place
                        rawDescriptor.value = this.getSecureValue(rawDescriptorValue);
                    }
                    if (!isUndefined(secureDescriptor) && secureDescriptor.configurable === false) {
                        // this is the case where the secure env has a descriptor that was supposed to be
                        // overrule but can't be done because it is a non-configurable. Instead we try to
                        // fallback to some more advanced gymnastics
                        if (hasOwnProperty(secureDescriptor, 'value') && isProxyTarget(secureDescriptor.value)) {
                            const { value: secureDescriptorValue } = secureDescriptor;
                            if (!this.som.has(secureDescriptorValue)) {
                                // remapping the value of the secure object graph to the outer realm graph
                                const { value: rawDescriptorValue } = rawDescriptor;
                                if (secureValue !== rawDescriptorValue) {
                                    if (this.getRawValue(secureValue) !== rawValue) {
                                        console.error('need remapping: ', key, rawValue, rawDescriptor);
                                    }
                                }
                                else {
                                    // window.top is the classic example of a descriptor that leaks access to the outer
                                    // window reference, and there is no containment for that case yet.
                                    console.error('leaking: ', key, rawValue, rawDescriptor);
                                }
                            }
                            else {
                                // an example of this is circular window.window ref
                                console.info('circular: ', key, rawValue, rawDescriptor);
                            }
                        }
                        else if (hasOwnProperty(secureDescriptor, 'get') && isProxyTarget(secureValue[key])) {
                            const secureDescriptorValue = secureValue[key];
                            if (secureDescriptorValue === secureValue[key]) {
                                // this is the case for window.document which is identity preserving getter
                                // const rawDescriptorValue = rawValue[key];
                                // this.createSecureRecord(secureDescriptorValue, rawDescriptorValue);
                                // this.installDescriptors(secureDescriptorValue, rawDescriptorValue, getOwnPropertyDescriptors(rawDescriptorValue));
                                console.error('need remapping: ', key, rawValue, rawDescriptor);
                                if (isExtensible(secureDescriptorValue)) {
                                    // remapping proto chain
                                    // setPrototypeOf(secureDescriptorValue, this.getSecureValue(getPrototypeOf(secureDescriptorValue)));
                                    console.error('needs prototype remapping: ', rawValue);
                                }
                                else {
                                    console.error('leaking prototype: ', key, rawValue, rawDescriptor);
                                }
                            }
                            else {
                                console.error('leaking a getter returning values without identity: ', key, rawValue, rawDescriptor);
                            }
                        }
                        else {
                            console.error('skipping: ', key, rawValue, rawDescriptor);
                        }
                    }
                    else {
                        ObjectDefineProperty(secureValue, key, rawDescriptor);
                    }
                }
            }
        }
    }
    // membrane operations
    getSecureValue(raw) {
        if (isArray(raw)) {
            return this.getSecureArray(raw);
        }
        else if (isProxyTarget(raw)) {
            let sr = this.rom.get(raw);
            if (isUndefined(sr)) {
                return this.createSecureProxy(this.getDistortedValue(raw));
            }
            return sr.sec;
        }
        else {
            return raw;
        }
    }
    getSecureArray(a) {
        // identity of the new array correspond to the inner realm
        const SecureArray = this.secureGlobalThis.Array;
        const b = map(a, (raw) => this.getSecureValue(raw));
        return construct(SecureArray, b);
    }
    getSecureFunction(fn) {
        let sr = this.rom.get(fn);
        if (isUndefined(sr)) {
            return this.createSecureProxy(this.getDistortedValue(fn));
        }
        return sr.sec;
    }
    getRawValue(sec) {
        if (isArray(sec)) {
            return this.getRawArray(sec);
        }
        else if (isProxyTarget(sec)) {
            let sr = this.som.get(sec);
            if (isUndefined(sr)) {
                return this.createReverseProxy(sec);
            }
            return sr.raw;
        }
        return sec;
    }
    getRawFunction(fn) {
        let sr = this.som.get(fn);
        if (isUndefined(sr)) {
            return this.createReverseProxy(fn);
        }
        return sr.raw;
    }
    getRawArray(a) {
        // identity of the new array correspond to the outer realm
        return map(a, (sec) => this.getRawValue(sec));
    }
    get globalThis() {
        return this.secureGlobalThis;
    }
}

const unsafeGlobalSrc = "'use strict'; this";
function createSecureEnvironment(distortionCallback) {
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
    const rawGlobalThis = getGlobalThis();
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
    env.remap(secureDocument, rawDocument, { /* it only has location, which is ignored for now */});
    setPrototypeOf(secureDocument, env.getSecureValue(rawDocumentProto));
    // remapping window proto chain backward
    env.remap(secureEventTargetProto, rawEventTargetProto, rawEventTargetProtoDescriptors);
    env.remap(secureWindowPropertiesProto, rawWindowPropertiesProto, rawWindowPropertiesProtoDescriptors);
    env.remap(secureWindowProto, rawWindowProto, rawWindowProtoDescriptors);
    env.remap(secureGlobalThis, rawGlobalThis, rawGlobalThisDescriptors);
    return secureGlobalThis;
}

// getting reference to the function to be distorted
const { get: ShadowRootHostGetter } = Object.getOwnPropertyDescriptor(ShadowRoot.prototype, 'host');
const { assignedNodes, assignedElements } = HTMLSlotElement.prototype;

const distortionMap = new Map();
distortionMap.set(ShadowRootHostGetter, _ => { throw new Error(`Forbidden`); });
distortionMap.set(assignedNodes, _ => { throw new Error(`Forbidden`); });
distortionMap.set(assignedElements, _ => { throw new Error(`Forbidden`); });

function distortionCallback(t) {
    const d = distortionMap.get(t);
    return d === undefined ? t : d;
}

function evaluateInNewSandbox(sourceText) {
    const secureGlobalThis = createSecureEnvironment(distortionCallback);
    secureGlobalThis.eval(sourceText);
}

document.querySelector('button').addEventListener('click', function (e) {
    const sourceText = document.querySelector('textarea').value;
    evaluateInNewSandbox(sourceText);
});
