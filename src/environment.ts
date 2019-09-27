import '../node_modules/realms-shim/dist/realms-shim.umd.js';
import { apply, isUndefined, ObjectCreate, isFunction, hasOwnProperty, ObjectDefineProperty, emptyArray } from './shared';
import { SecureProxyHandler } from './secure-proxy-handler';
import { ReverseProxyHandler } from './reverse-proxy-handler';

/**
 * This method returns a descriptor that given an original setter, and a getter, can use the original
 * getter to return a secure object, but if the sandbox attempts to set it to a new value, this
 * mutation will only affect the sandbox's global object, and the getter will start returning the
 * new provided value rather than calling onto the outer realm. This is to preserve the object graph
 * of the outer realm.
 */
function getSecureGlobalAccessorDescriptor(env: SecureEnvironment, descriptor: PropertyDescriptor): PropertyDescriptor {
    const { get: originalGetter } = descriptor;
    let currentGetter = isUndefined(originalGetter) ? () => undefined : function(this: any): SecureValue {
        // TODO: hack because the realms-shim is leaking their shadow target, so we need
        // to use this.__proto__ to unroll that and get the real window. issue:
        // https://github.com/Agoric/realms-shim/pull/45
        const value: RawValue = apply(originalGetter, env.getRawValue(this.__proto__), emptyArray);
        return env.getSecureValue(value);
    }
    if (!isUndefined(originalGetter)) {
        descriptor.get = function get(): SecureValue {
            return apply(currentGetter, this, emptyArray);
        };
    }
    descriptor.set = function set(v: SecureValue): void {
        // if a global setter is invoke, the value will be use as it is as the result of the getter operation
        currentGetter = () => v;
    };
    return descriptor;
}

function installLazyGlobals(env: SecureEnvironment, baseDescriptors: PropertyDescriptorMap) {
    const { globalThis: realmGlobalThis } = env;
    for (let key in baseDescriptors) {
        // avoid poisoning to only installing own properties from baseDescriptors,
        // and avoid overriding existing keys on the realmGlobalThis (TODO: this second condition might need to be revisited)
        if (hasOwnProperty(baseDescriptors, key) && !hasOwnProperty(realmGlobalThis, key)) {
            let descriptor = baseDescriptors[key];
            if (hasOwnProperty(descriptor, 'set')) {
                // setter, and probably getter branch
                descriptor = getSecureGlobalAccessorDescriptor(env, descriptor);
            } else if (hasOwnProperty(descriptor, 'get')) {
                // getter only branch (e.g.: window.navigator)
                const { get: originalGetter } = descriptor;
                descriptor.get = function get(): SecureValue {
                    const value: RawValue = apply(originalGetter as () => any, env.getRawValue(this), emptyArray);
                    return env.getSecureValue(value);
                };
            } else {
                // value branch
                const { value: originalValue } = descriptor;
                // TODO: maybe we should make everything a getter/setter that way
                // we don't pay the cost of creating the proxy in the first place
                descriptor.value = env.getSecureValue(originalValue);
            }
            ObjectDefineProperty(realmGlobalThis, key, descriptor);
        }
    }
}

export type RawValue = any;
export type RawArray = RawValue[];
export type RawFunction = (...args: RawValue[]) => RawValue;
export type RawObject = object;
export interface RawConstructor {
    new(...args: any[]): RawObject;
}
export type SecureProxyTarget = RawObject | RawFunction | RawConstructor;
export type ReverseProxyTarget = SecureObject | SecureFunction | SecureConstructor;
// TODO: how to doc the ProxyOf<>
export type SecureShadowTarget = SecureProxyTarget; // Proxy<SecureProxyTarget>;
export type ReverseShadowTarget = ReverseProxyTarget; // Proxy<ReverseProxyTarget>;

type SecureProxy = SecureObject | SecureFunction;
type ReverseProxy = RawObject | RawFunction;

export type SecureValue = any;
export type SecureFunction = (...args: SecureValue[]) => SecureValue;
export type SecureArray = SecureValue[];
export type SecureObject = object;
export interface SecureConstructor {
    new(...args: any[]): SecureObject;
}
interface SecureRecord {
    raw: SecureProxyTarget;
    sec: SecureProxy;
}

// TODO: Realm definitions should come from the realms-shim package
interface RealmObject {
    global: object;
    evaluate(src: string): any;
}
interface RealmConstructor {
    makeRootRealm(): RealmObject;
    makeCompartment(): RealmObject;
}

// it means it does have identity and should be proxified.
function isProxyTarget(o: RawValue | SecureValue):
    o is (RawFunction | RawConstructor | RawObject | SecureFunction | SecureConstructor | SecureObject) {
    // hire-wired for the common case
    if (o == null) {
        return false;
    }
    const t = typeof o;
    return t === 'object' || t === 'function';
}

interface SecureEnvironmentOptions {
    // Base global object to be wrapped by the secure environment
    global: object;
    // Base descriptors to be accessible in the secure environment
    descriptors: PropertyDescriptorMap;
    // Optional distortion hook to prevent access to certain capabilities from within the secure environment
    distortionCallback?: (target: SecureProxyTarget) => SecureProxyTarget;
}

export class SecureEnvironment {
    // env realm
    private realm: RealmObject = ((globalThis as any).Realm as RealmConstructor).makeRootRealm();
    // secure object map
    private som: WeakMap<SecureFunction | SecureObject, SecureRecord> = new WeakMap();
    // raw object map
    private rom: WeakMap<RawFunction | RawObject, SecureRecord> = new WeakMap();
    // distortion mechanism (default to noop)
    private distortionCallback?: (target: SecureProxyTarget) => SecureProxyTarget = t => t;

    constructor(options: SecureEnvironmentOptions) {
        if (isUndefined(options) || isUndefined(options.descriptors)) {
            throw new Error(`Missing descriptors options which must be a PropertyDescriptorMap`);
        }
        const { global, descriptors, distortionCallback } = options;
        this.distortionCallback = distortionCallback;
        const secureGlobal = this.realm.global as any;
        // These are foundational things that should never be wrapped but are equivalent
        // TODO: revisit this, is this really needed? what happen if Object.prototype is patched in the sec env?
        this.createSecureRecord(secureGlobal, global);
        this.createSecureRecord(secureGlobal.Object, Object);
        this.createSecureRecord(secureGlobal.Object.prototype, Object.prototype);
        this.createSecureRecord(secureGlobal.Function, Function);
        this.createSecureRecord(secureGlobal.Function.prototype, Function.prototype);
        // complete realm by installing new globals to match the behavior of the outer realm
        installLazyGlobals(this, descriptors);
    }

    private createSecureShadowTarget(o: SecureProxyTarget): SecureShadowTarget {
        let shadowTarget: SecureShadowTarget;
        if (isFunction(o)) {
            shadowTarget = function () {};
            ObjectDefineProperty(shadowTarget, 'name', {
                value: o.name,
                configurable: true,
            });
        } else {
            // o is object
            shadowTarget = {};
        }
        return shadowTarget;
    }
    private createReverseShadowTarget(o: SecureProxyTarget | ReverseProxyTarget): ReverseShadowTarget {
        let shadowTarget: ReverseShadowTarget;
        if (isFunction(o)) {
            shadowTarget = function () {};
            ObjectDefineProperty(shadowTarget, 'name', {
                value: o.name,
                configurable: true,
            });
        } else {
            // o is object
            shadowTarget = {};
        }
        return shadowTarget;
    }
    private createSecureProxy(raw: SecureProxyTarget): SecureProxy {
        const shadowTarget = this.createSecureShadowTarget(raw);
        const proxyHandler = new SecureProxyHandler(this, raw);
        const sec = new Proxy(shadowTarget, proxyHandler);
        this.createSecureRecord(sec, raw);
        return sec;
    }
    private createReverseProxy(sec: ReverseProxyTarget): ReverseProxy {
        const shadowTarget = this.createReverseShadowTarget(sec);
        const proxyHandler = new ReverseProxyHandler(this, sec);
        const raw = new Proxy(shadowTarget, proxyHandler);
        this.createSecureRecord(sec, raw);
        // eager initialization of reverse proxies
        proxyHandler.initialize(shadowTarget);
        return raw;
    }
    private createSecureRecord(sec: SecureObject, raw: RawObject) {
        const sr: SecureRecord = ObjectCreate(null);
        sr.raw = raw;
        sr.sec = sec;
        // double index for perf
        this.som.set(sec, sr);
        this.rom.set(raw, sr);
    }
    private getDistortedValue(target: SecureProxyTarget): SecureProxyTarget {
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

    // membrane operations
    getSecureValue(raw: RawValue): SecureValue {
        if (isProxyTarget(raw)) {
            let sr = this.rom.get(raw);
            if (isUndefined(sr)) {
                return this.createSecureProxy(this.getDistortedValue(raw));
            }
            return sr.sec;
        } else {
            return raw as SecureValue;
        }
    }
    getSecureArray(a: RawArray): SecureArray {
        // identity of the new array correspond to the inner realm
        const SecureArray = (this.realm.global as any).Array as ArrayConstructor;
        return new SecureArray(...a).map((raw: RawValue) => this.getSecureValue(raw));
    }
    getSecureFunction(fn: RawFunction): SecureFunction {
        let sr = this.rom.get(fn);
        if (isUndefined(sr)) {
            return this.createSecureProxy(this.getDistortedValue(fn)) as SecureFunction;
        }
        return sr.sec as SecureFunction;
    }
    getRawValue(sec: SecureValue): RawValue {
        if (isProxyTarget(sec)) {
            let sr = this.som.get(sec);
            if (isUndefined(sr)) {
                return this.createReverseProxy(sec);
            }
            return sr.raw;
        }
        return sec as RawValue;
    }
    getRawFunction(fn: SecureFunction): RawFunction {
        let sr = this.som.get(fn);
        if (isUndefined(sr)) {
            return this.createReverseProxy(fn) as RawFunction;
        }
        return sr.raw as SecureFunction;
    }
    getRawArray(a: SecureArray): RawArray {
        // identity of the new array correspond to the outer realm
        return [...a].map((sec: SecureValue) => this.getRawValue(sec));
    }

    // realm operations
    evaluate(src: string) {
        // intentionally not returning the result of the evaluation
        this.realm.evaluate(src);
    }

    get globalThis(): RawValue {
        return this.realm.global;
    }
}
