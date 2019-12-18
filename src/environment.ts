import { 
    apply, 
    assign,
    isUndefined, 
    ObjectCreate, 
    isFunction, 
    hasOwnProperty, 
    ReflectDefineProperty, 
    emptyArray, 
    isArray, 
    map, 
    construct,
    ErrorCreate,
    ESGlobalKeys, 
    ProxyCreate,
    ReflectGetOwnPropertyDescriptor, 
    ReflectIsExtensible,
    SetHas,
    WeakMapCreate,
    WeakMapGet,
    WeakMapHas,
    WeakMapSet,
    ReflectiveIntrinsicObjectNames,
} from './shared';
import { SecureProxyHandler } from './secure-proxy-handler';
import { ReverseProxyHandler } from './reverse-proxy-handler';

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
    // Base global object used by the raw environment
    rawGlobalThis: RawObject & typeof globalThis;
    // Secure global object used by the secure environment
    secureGlobalThis: SecureObject & typeof globalThis;
    // Optional distortion hook to prevent access to certain capabilities from within the secure environment
    distortionCallback?: (target: SecureProxyTarget) => SecureProxyTarget;
}

export class SecureEnvironment {
    // secure object map
    private som: WeakMap<SecureFunction | SecureObject, SecureRecord> = WeakMapCreate();
    // raw object map
    private rom: WeakMap<RawFunction | RawObject, SecureRecord> = WeakMapCreate();
    // distortion mechanism (default to noop)
    private distortionCallback?: (target: SecureProxyTarget) => SecureProxyTarget = t => t;

    // cached utilities
    private secureProxyConstructor: ProxyConstructor;
    private secureArrayConstructor: ArrayConstructor;

    constructor(options: SecureEnvironmentOptions) {
        if (isUndefined(options)) {
            throw ErrorCreate(`Missing SecureEnvironmentOptions options bag.`);
        }
        const { rawGlobalThis, secureGlobalThis, distortionCallback } = options;
        this.distortionCallback = distortionCallback;
        // remapping intrinsics that are realm's agnostic
        for (let i = 0, len = ReflectiveIntrinsicObjectNames.length; i < len; i += 1) {
            const name = ReflectiveIntrinsicObjectNames[i];
            const raw = rawGlobalThis[name];
            const secure = secureGlobalThis[name];
            this.createSecureRecord(secure, raw);
            this.createSecureRecord(secure.prototype, raw.prototype);
        }
        // caching utilities
        this.secureProxyConstructor = secureGlobalThis.Proxy;
        this.secureArrayConstructor = secureGlobalThis.Array;
    }

    private createProxyInSandbox(shadowTarget: SecureShadowTarget, proxyHandler: SecureProxyHandler): SecureProxy {
        // Using the Proxy constructor from the sandbox to avoid stack overflow leakages (see #48)
        return new this.secureProxyConstructor(shadowTarget, proxyHandler);
    }
    private createSecureShadowTarget(o: SecureProxyTarget): SecureShadowTarget {
        let shadowTarget: SecureShadowTarget;
        if (isFunction(o)) {
            shadowTarget = function () {};
            const nameDescriptor = ObjectCreate(null);
            nameDescriptor.configurable = true;
            nameDescriptor.value = o.name;
            ReflectDefineProperty(shadowTarget, 'name', nameDescriptor);
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
            const nameDescriptor = ObjectCreate(null);
            nameDescriptor.configurable = true;
            nameDescriptor.value = o.name;
            ReflectDefineProperty(shadowTarget, 'name', nameDescriptor);
        } else {
            // o is object
            shadowTarget = {};
        }
        return shadowTarget;
    }
    private createSecureProxy(raw: SecureProxyTarget): SecureProxy {
        const shadowTarget = this.createSecureShadowTarget(raw);
        const proxyHandler = new SecureProxyHandler(this, raw);
        const sec = this.createProxyInSandbox(shadowTarget, proxyHandler);
        this.createSecureRecord(sec, raw);
        return sec;
    }
    private createReverseProxy(sec: ReverseProxyTarget): ReverseProxy {
        const shadowTarget = this.createReverseShadowTarget(sec);
        const proxyHandler = new ReverseProxyHandler(this, sec);
        const raw = ProxyCreate(shadowTarget, proxyHandler);
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
        WeakMapSet(this.som, sec, sr);
        WeakMapSet(this.rom, raw, sr);
    }
    private getDistortedValue(target: SecureProxyTarget): SecureProxyTarget {
        const { distortionCallback } = this;
        if (!isFunction(distortionCallback)) {
            return target;
        }
        const distortedTarget = distortionCallback(target);
        if (!isProxyTarget(distortedTarget)) {
            throw ErrorCreate(`Invalid distortion mechanism.`);
        }
        return distortedTarget;
    }

    remap(secureValue: SecureValue, rawValue: RawValue, rawDescriptors: PropertyDescriptorMap) {
        this.createSecureRecord(secureValue, rawValue);
        for (const key in rawDescriptors) {
            // TODO: this whole loop needs cleanup and simplification avoid
            // overriding ECMA script global keys.
            if (SetHas(ESGlobalKeys, key) || !hasOwnProperty(rawDescriptors, key)) {
                continue;
            }

            // avoid poisoning to only installing own properties from baseDescriptors
            const rawDescriptor = assign(ObjectCreate(null), rawDescriptors[key]);
            if ('value' in rawDescriptor) {
                // TODO: maybe we should make everything a getter/setter that way
                // we don't pay the cost of creating the proxy in the first place
                rawDescriptor.value = this.getSecureValue(rawDescriptor.value);
            } else {
               // Use the original getter to return a secure object, but if the 
               // sandbox attempts to set it to a new value, this mutation will
               // only affect the sandbox's global object, and the getter will
               // start returning the new provided value rather than calling onto
               // the outer realm. This is to preserve the object graph of the
               // outer realm.
                const env = this;
                const { get: originalGetter } = rawDescriptor;
                
                let currentGetter = !isFunction(rawDescriptor.get) ? () => undefined : function(this: any): SecureValue {
                    const value: RawValue = apply(originalGetter as () => any, env.getRawValue(this), emptyArray);
                    return env.getSecureValue(value);
                };

                rawDescriptor.get = function(): SecureValue {
                    return apply(currentGetter, this, emptyArray);
                };

                if (isFunction(rawDescriptor.set)) {
                    rawDescriptor.set = function(v: SecureValue): void {
                        // if a global setter is invoke, the value will be use as it is as the result of the getter operation
                        currentGetter = () => v;
                    };
                }
            }

            const secureDescriptor = ReflectGetOwnPropertyDescriptor(secureValue, key);
            if (!isUndefined(secureDescriptor) && 
                    hasOwnProperty(secureDescriptor, 'configurable') &&  
                    secureDescriptor.configurable === false) {
                // this is the case where the secure env has a descriptor that was supposed to be
                // overrule but can't be done because it is a non-configurable. Instead we try to
                // fallback to some more advanced gymnastics
                if (hasOwnProperty(secureDescriptor, 'value') && isProxyTarget(secureDescriptor.value)) {
                    const { value: secureDescriptorValue } = secureDescriptor;
                    if (!WeakMapHas(this.som, secureDescriptorValue)) {
                        // remapping the value of the secure object graph to the outer realm graph
                        const { value: rawDescriptorValue } = rawDescriptor;
                        if (secureValue !== rawDescriptorValue) {
                            if (this.getRawValue(secureValue) !== rawValue) {
                                console.error('need remapping: ',  key, rawValue, rawDescriptor);
                            } else {
                                // it was already mapped
                            }
                        } else {
                            // window.top is the classic example of a descriptor that leaks access to the outer
                            // window reference, and there is no containment for that case yet.
                            console.error('leaking: ',  key, rawValue, rawDescriptor);
                        }
                    } else {
                        // an example of this is circular window.window ref
                        console.info('circular: ',  key, rawValue, rawDescriptor);
                    }
                } else if (hasOwnProperty(secureDescriptor, 'get')) {
                    const secureDescriptorValue = secureValue[key];
                    if (isProxyTarget(secureDescriptorValue)) {
                        if (secureDescriptorValue === secureValue[key]) {
                            // this is the case for window.document which is identity preserving getter
                            // const rawDescriptorValue = rawValue[key];
                            // this.createSecureRecord(secureDescriptorValue, rawDescriptorValue);
                            // this.installDescriptors(secureDescriptorValue, rawDescriptorValue, getOwnPropertyDescriptors(rawDescriptorValue));
                            console.error('need remapping: ', key, rawValue, rawDescriptor);
                            if (ReflectIsExtensible(secureDescriptorValue)) {
                                // remapping proto chain
                                // ReflectSetPrototypeOf(secureDescriptorValue, this.getSecureValue(ReflectGetPrototypeOf(secureDescriptorValue)));
                                console.error('needs prototype remapping: ', key, rawValue);
                            } else {
                                console.error('leaking prototype: ',  key, rawValue, rawDescriptor);
                            }
                        } else {
                            console.error('leaking a getter returning values without identity: ', key, rawValue, rawDescriptor);
                        }
                    } else {
                        console.error('skipping: ', key, rawValue, rawDescriptor);
                    }
                }
            } else {
                ReflectDefineProperty(secureValue, key, rawDescriptor);
            }
        }
    }

    // membrane operations
    getSecureValue(raw: RawValue): SecureValue {
        if (isArray(raw)) {
            return this.getSecureArray(raw);
        } else if (isProxyTarget(raw)) {
            const sr = WeakMapGet(this.rom, raw);
            if (isUndefined(sr)) {
                return this.createSecureProxy(this.getDistortedValue(raw));
            }
            return sr.sec;
        } else {
            return raw as SecureValue;
        }
    }
    getSecureArray(a: RawArray): SecureArray {
        const b: SecureValue[] = map(a, (raw: RawValue) => this.getSecureValue(raw));
        // identity of the new array correspond to the inner realm
        return construct(this.secureArrayConstructor, b);
    }
    getSecureFunction(fn: RawFunction): SecureFunction {
        const sr = WeakMapGet(this.rom, fn);
        if (isUndefined(sr)) {
            return this.createSecureProxy(this.getDistortedValue(fn)) as SecureFunction;
        }
        return sr.sec as SecureFunction;
    }
    getRawValue(sec: SecureValue): RawValue {
        if (isArray(sec)) {
            return this.getRawArray(sec);
        } else if (isProxyTarget(sec)) {
            const sr = WeakMapGet(this.som, sec);
            if (isUndefined(sr)) {
                return this.createReverseProxy(sec);
            }
            return sr.raw;
        }
        return sec as RawValue;
    }
    getRawFunction(fn: SecureFunction): RawFunction {
        const sr = WeakMapGet(this.som, fn);
        if (isUndefined(sr)) {
            return this.createReverseProxy(fn) as RawFunction;
        }
        return sr.raw as SecureFunction;
    }
    getRawArray(a: SecureArray): RawArray {
        // identity of the new array correspond to the outer realm
        return map(a, (sec: SecureValue) => this.getRawValue(sec));
    }
}
