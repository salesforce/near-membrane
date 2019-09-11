import '../node_modules/realms-shim/dist/realms-shim.umd.js';
import { isUndefined, ObjectCreate, isFunction, hasOwnProperty, ObjectDefineProperty } from './shared';
import { SecureProxyHandler } from './secure-proxy-handler';
import { ReverseProxyHandler } from './reserve-proxy-handler';

function installLazyGlobals(r: SecureEnvironment, descriptors: PropertyDescriptorMap) {
    const { globalThis: realmGlobalThis } = r;
    for (let key in descriptors) {
        // avoid any operation on existing keys
        if (!hasOwnProperty.call(realmGlobalThis, key)) {
            let descriptor = descriptors[key];
            // normally, we could just rely on getSecureDescriptor() but
            // apparently there is an issue with the scoping of the shim
            // for global accessors, where the `this` value is incorrect.
            // At least observable when using proxies.
            // TODO: use the following line:
            // descriptor = getSecureDescriptor(descriptor);

            // For now, we just do a manual composition:
            const { set: originalSetter, get: originalGetter, value: originalValue } = descriptor;
            if (!isUndefined(originalGetter)) {
                descriptor.get = function get(): any {
                    return r.getSecureValue(originalGetter.call(globalThis));
                };
            }
            if (!isUndefined(originalSetter)) {
                descriptor.set = function set(v: any): void {
                    originalSetter.call(globalThis, v);
                };
            }
            if (!isUndefined(originalValue)) {
                descriptor.value = r.getSecureValue(originalValue);
            }
            Object.defineProperty(realmGlobalThis, key, descriptor);
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
    descriptors: PropertyDescriptorMap;
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
        const { descriptors, distortionCallback } = options;
        this.distortionCallback = distortionCallback;
        // complete realm, and remove things that we don't support (e.g.: globalThis.Realm)
        // caches
        const secGlobals = this.realm.global as any;
        this.createSecureRecord(secGlobals.Object, Object);
        this.createSecureRecord(secGlobals.Object.prototype, Object.prototype);
        this.createSecureRecord(secGlobals.Function, Function);
        this.createSecureRecord(secGlobals.Function.prototype, Function.prototype);
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
            // raw is object
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
            // raw is object
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
        // eager initialization of reserve proxies
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
