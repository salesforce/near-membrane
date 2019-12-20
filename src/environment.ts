import { 
    apply, 
    assign,
    isUndefined, 
    isNullish,
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
    ProxyRevocable,
    ReflectGetOwnPropertyDescriptor, 
    ReflectIsExtensible,
    SetHas,
    WeakMapCreate,
    WeakMapGet,
    WeakMapHas,
    WeakMapSet,
    ReflectiveIntrinsicObjectNames,
    isRevokedProxy,
} from './shared';
import { SecureProxyHandler } from './secure-proxy-handler';
import { ReverseProxyHandler } from './reverse-proxy-handler';
import {
    SecureObject,
    SecureFunction,
    RawFunction,
    RawObject,
    SecureProxyTarget,
    RawValue,
    SecureValue,
    RawConstructor,
    SecureConstructor,
    ReverseProxyTarget,
    RawArray,
    SecureArray,
    getTargetMeta,
    createShadowTarget,
} from './membrane';

type SecureProxy = SecureObject | SecureFunction;
type ReverseProxy = RawObject | RawFunction;

interface SecureRecord {
    // Ref to a value created inside the sandbox.
    raw: SecureProxyTarget;
    // Proxy of an reference from the outer realm.
    sec: SecureProxy;
}

export type DistortionMap = WeakMap<SecureProxyTarget, SecureProxyTarget>;

// it means it does have identity and should be proxified.
function isProxyTarget(o: RawValue | SecureValue):
    o is (RawFunction | RawConstructor | RawObject | SecureFunction | SecureConstructor | SecureObject) {
    // hire-wired for the common case
    if (isNullish(o)) {
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
    // Optional distortion map to tame functionalities observed through the membrane
    distortionMap?: Map<SecureProxyTarget, SecureProxyTarget>;
}

export class SecureEnvironment {
    // secure object map
    private som: WeakMap<SecureFunction | SecureObject, SecureRecord> = WeakMapCreate();
    // raw object map
    private rom: WeakMap<RawFunction | RawObject, SecureRecord> = WeakMapCreate();
    // distortion mechanism (default to noop)
    private distortionMap: DistortionMap;

    // cached utilities
    private secureProxyRevocable: <T extends object>(target: T, handler: ProxyHandler<T>) => { proxy: T; revoke: () => void; }
    private secureArrayConstructor: ArrayConstructor;

    constructor(options: SecureEnvironmentOptions) {
        if (isUndefined(options)) {
            throw ErrorCreate(`Missing SecureEnvironmentOptions options bag.`);
        }
        const { rawGlobalThis, secureGlobalThis, distortionMap } = options;
        this.distortionMap = WeakMapCreate(isUndefined(distortionMap) ? [] : distortionMap.entries());
        // remapping intrinsics that are realm's agnostic
        for (let i = 0, len = ReflectiveIntrinsicObjectNames.length; i < len; i += 1) {
            const name = ReflectiveIntrinsicObjectNames[i];
            const raw = rawGlobalThis[name];
            const secure = secureGlobalThis[name];
            this.createSecureRecord(secure, raw);
            this.createSecureRecord(secure.prototype, raw.prototype);
        }
        // caching utilities
        this.secureProxyRevocable = secureGlobalThis.Proxy.revocable;
        this.secureArrayConstructor = secureGlobalThis.Array;
    }

    private createSecureProxy(raw: SecureProxyTarget): SecureProxy {
        if (this.som.has(raw)) {
            throw new Error('Invariant Violation');
        }
        const shadowTarget = createShadowTarget(raw);
        const meta = getTargetMeta(raw);
        const proxyHandler = new SecureProxyHandler(this, raw, meta);
        // Using the Proxy.revocable from the sandbox to avoid stack overflow leakages (see #48)
        const { secureProxyRevocable } = this;
        const { proxy, revoke } = secureProxyRevocable(shadowTarget, proxyHandler);
        this.createSecureRecord(proxy, raw);
        if (meta.isBroken || isRevokedProxy(raw)) {
            // a failure during the meta extraction or the target is a revoked proxy
            // in which case we prefer to make the new proxy unusable to avoid any leak.
            revoke();
        }
        return proxy;
    }
    private createReverseProxy(sec: ReverseProxyTarget): ReverseProxy {
        if (this.rom.has(sec)) {
            throw new Error('Invariant Violation');
        }
        const shadowTarget = createShadowTarget(sec);
        const meta = getTargetMeta(sec);
        const proxyHandler = new ReverseProxyHandler(this, sec, meta);
        const { proxy, revoke } = ProxyRevocable(shadowTarget, proxyHandler);
        this.createSecureRecord(sec, proxy);
        if (meta.isBroken || isRevokedProxy(sec)) {
            // a failure during the meta extraction or the target is a revoked proxy
            // in which case we prefer to make the new proxy unusable to avoid any leak.
            revoke();
        } else {
            // eager initialization of reverse proxies
            proxyHandler.initialize(shadowTarget);
        }
        return proxy;
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
        const { distortionMap } = this;
        if (!WeakMapHas(distortionMap, target)) {
            return target;
        }
        // if a distortion entry is found, it must be a valid proxy target
        const distortedTarget = WeakMapGet(distortionMap, target) as SecureProxyTarget;
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
