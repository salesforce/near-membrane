import 'realms-shim/dist/realms-shim.umd';
import { globals } from './globals';
import { isUndefined, ObjectCreate, isFunction, getOwnPropertyDescriptor, getOwnPropertyNames, getOwnPropertySymbols, hasOwnProperty, ObjectDefineProperty } from './shared.js';
import { SecureProxyHandler } from './secure-proxy-handler.js';
import { ReverseProxyHandler } from './reserve-proxy-handler';

const windowOwnKeys = [...getOwnPropertyNames(window), ...getOwnPropertySymbols(window)];

function installLazyGlobals(r: SecureDOMEnvironment) {
    const { window: realmWindow } = r;
    for (let i = 0, len = windowOwnKeys.length; i < len; i += 1) {
        const key = windowOwnKeys[i];
        // avoid any operation on existing keys
        if (!hasOwnProperty.call(realmWindow, key)) {
            let descriptor = getOwnPropertyDescriptor(window, key);
            // must be present since we are reading from window
            if (isUndefined(descriptor)) {
                throw new Error(`Internal Error`);
            }
            if (hasOwnProperty.call(globals, key)) {
                // TODO: to be implemented
                // is a constructor to be controlled
                // if (isUndefined(descriptor.value) || !isUndefined(descriptor.get)) {
                throw new Error(`Internal Error`);
                // }
                // descriptor.value = r.getSecureFunction(window[key]);
            } else {
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
                        return r.getSecureValue(originalGetter.call(window));
                    };
                }
                if (!isUndefined(originalSetter)) {
                    // TODO: should we allow this? can this mutation be done at the SecureWindow level?
                    descriptor.set = function set(v: any): void {
                        originalSetter.call(window, v);
                    };
                }
                if (!isUndefined(originalValue)) {
                    descriptor.value = r.getSecureValue(originalValue);
                }
            }
            Object.defineProperty(realmWindow, key, descriptor);
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

interface SecureWindow extends Window {
    // Blacklisting
}

interface RealmObject {
    global: Window;
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

export class SecureDOMEnvironment {
    // env realm
    private realm: RealmObject = ((window as any).Realm as RealmConstructor).makeRootRealm();
    // secure object map
    private som: WeakMap<SecureFunction | SecureObject, SecureRecord> = new WeakMap();
    // raw object map
    private rom: WeakMap<RawFunction | RawObject, SecureRecord> = new WeakMap();

    constructor() {
        // complete realm, and remove things that we don't support (e.g.: globalThis.Realm)
        // caches
        const secGlobals = this.realm.global as any;
        this.createSecureRecord(secGlobals.Object, Object);
        this.createSecureRecord(secGlobals.Object.prototype, Object.prototype);
        this.createSecureRecord(secGlobals.Function, Function);
        this.createSecureRecord(secGlobals.Function.prototype, Function.prototype);
        installLazyGlobals(this);
    }

    private createSecureShadowTarget(o: SecureProxyTarget): SecureShadowTarget {
        let shadowTarget: SecureShadowTarget;
        if (isFunction(o)) {
            // TODO: proto
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
            // TODO: proto
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
    private createSecureRecord(sec: SecureObject, raw: RawObject): SecureRecord {
        const sr: SecureRecord = ObjectCreate(null);
        sr.raw = raw;
        sr.sec = sec;
        // double index for perf
        this.som.set(sec, sr);
        this.rom.set(raw, sr);
        return sr; // TODO: do we really need to return this?
    }

    // membrane operations
    getSecureValue(raw: RawValue): SecureValue {
        if (isProxyTarget(raw)) {
            let sr = this.rom.get(raw);
            if (isUndefined(sr)) {
                return this.createSecureProxy(raw);
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
            return this.createSecureProxy(fn) as SecureFunction;
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

    get window(): SecureWindow {
        return this.realm.global;
    }
}
