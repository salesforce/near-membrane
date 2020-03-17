import { 
    apply, 
    assign,
    isUndefined, 
    isNullOrUndefined,
    ObjectCreate, 
    isFunction, 
    hasOwnProperty, 
    ReflectDefineProperty, 
    emptyArray,
    ErrorCreate,
    ESGlobalKeys,
    ReflectGetOwnPropertyDescriptor, 
    ReflectIsExtensible,
    SetHas,
    WeakMapCreate,
    WeakMapHas,
    WeakMapSet,
    ReflectiveIntrinsicObjectNames,
    WeakMapGet,
    construct,
} from './shared';
import { serializedSecureEnvSourceText, MarshalHooks } from './secure-value';
import { reverseProxyFactory } from './raw-value';
import {
    SecureObject,
    SecureFunction,
    RawFunction,
    RawObject,
    SecureProxyTarget,
    RawValue,
    SecureValue,
    RawConstructor,
    MembraneBroker,
    DistortionMap,
    SecureProxy,
    ReverseProxy,
    ReverseProxyTarget,
} from './types';

interface SecureEnvironmentOptions {
    // Base global object used by the raw environment
    rawGlobalThis: RawObject & typeof globalThis;
    // Secure global object used by the secure environment
    secureGlobalThis: SecureObject & typeof globalThis;
    // Optional distortion map to tame functionalities observed through the membrane
    distortionMap?: Map<SecureProxyTarget, SecureProxyTarget>;
}

export class SecureEnvironment implements MembraneBroker {
    // secure ref map to reverse proxy or raw ref
    som: WeakMap<SecureFunction | SecureObject, SecureProxyTarget | ReverseProxy> = WeakMapCreate();
    // raw ref map to secure proxy or secure ref
    rom: WeakMap<RawFunction | RawObject, SecureProxy | ReverseProxyTarget> = WeakMapCreate();
    // raw object distortion map
    distortionMap: DistortionMap;

    constructor(options: SecureEnvironmentOptions) {
        if (isUndefined(options)) {
            throw ErrorCreate(`Missing SecureEnvironmentOptions options bag.`);
        }
        const { rawGlobalThis, secureGlobalThis, distortionMap } = options;
        this.distortionMap = WeakMapCreate();
        // validating distortion entries
        distortionMap?.forEach((value, key) => {
            const o = typeof key;
            const d = typeof value;
            if (o !== d) {
                throw ErrorCreate(`Invalid distortion ${value}.`);
            }
            WeakMapSet(this.distortionMap, key, value);
        });
        // getting proxy factories ready per environment so we can produce
        // the proper errors without leaking instances into a sandbox
        const secureEnvFactory = secureGlobalThis.eval(`(${serializedSecureEnvSourceText})`);
        const rawHooks: MarshalHooks = {
            apply(target: RawFunction, thisArgument: RawValue, argumentsList: ArrayLike<RawValue>): RawValue {
                return apply(target, thisArgument, argumentsList);
            },
            construct(target: RawConstructor, argumentsList: ArrayLike<RawValue>, newTarget?: any): RawValue {
                return construct(target, argumentsList, newTarget);
            },
        };
        this.getSecureValue = secureEnvFactory(this, rawHooks);
        this.getRawValue = reverseProxyFactory(this);
        // remapping intrinsics that are realm's agnostic
        for (let i = 0, len = ReflectiveIntrinsicObjectNames.length; i < len; i += 1) {
            const name = ReflectiveIntrinsicObjectNames[i];
            const raw = rawGlobalThis[name];
            const secure = secureGlobalThis[name];
            this.setRefMapEntries(secure, raw);
            this.setRefMapEntries(secure.prototype, raw.prototype);
        }
    }

    getRawValue(sec: SecureValue): RawValue {
        // placeholder since this will be assigned in construction
    }

    getSecureValue(raw: RawValue): SecureValue {
        // placeholder since this will be assigned in construction
    }

    getRawRef(sec: SecureValue): RawValue | undefined {
        const raw: SecureValue | undefined = WeakMapGet(this.som, sec);
        if (!isUndefined(raw)) {
            return raw;
        }
    }

    getSecureRef(raw: RawValue): SecureValue | undefined {
        const sec: SecureValue | undefined = WeakMapGet(this.rom, raw);
        if (!isUndefined(sec)) {
            return sec;
        }
    }

    setRefMapEntries(sec: SecureObject, raw: RawObject) {
        // double index for perf
        WeakMapSet(this.som, sec, raw);
        WeakMapSet(this.rom, raw, sec);
    }

    remap(secureValue: SecureValue, rawValue: RawValue, rawDescriptors: PropertyDescriptorMap) {
        this.setRefMapEntries(secureValue, rawValue);
        for (const key in rawDescriptors) {
            // TODO: this whole loop needs cleanup and simplification avoid
            // overriding ECMA script global keys.
            if (SetHas(ESGlobalKeys, key) || !hasOwnProperty(rawDescriptors, key)) {
                continue;
            }

            // avoid poisoning by only installing own properties from rawDescriptors
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

                let currentGetter = () => undefined;
                if (isFunction(originalGetter)) {
                    const originalOrDistortedGetter: () => any = WeakMapGet(this.distortionMap, originalGetter) || originalGetter;
                    currentGetter = function(this: any): SecureValue {
                        const value: RawValue = apply(originalOrDistortedGetter, env.getRawValue(this), emptyArray);
                        return env.getSecureValue(value);
                    };
                }

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
                const securePropertyValue = secureValue[key];
                if (isNullOrUndefined(securePropertyValue)) {
                    continue;
                }
                const t = typeof securePropertyValue;
                // this is the case where the secure env has a descriptor that was supposed to be
                // overrule but can't be done because it is a non-configurable. Instead we try to
                // fallback to some more advanced gymnastics
                if (hasOwnProperty(secureDescriptor, 'value')) {
                    // valid proxy target (intentionally ignoring the case of document.all since it is not a value descriptor)
                    if (t === 'function' || t === 'object') {
                        if (!WeakMapHas(this.som, securePropertyValue)) {
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
                    }
                } else if (hasOwnProperty(secureDescriptor, 'get')) {
                    // internationally ignoring the case of (typeof document.all === 'undefined') because
                    // it is specified as configurable, you never get one of those exotic objects in this branch
                    if (t === 'function' || t === 'object') {
                        if (securePropertyValue === secureValue[key]) {
                            // this is the case for window.document which is identity preserving getter
                            // const rawDescriptorValue = rawValue[key];
                            // this.setRefMapEntries(secureDescriptorValue, rawDescriptorValue);
                            // this.installDescriptors(secureDescriptorValue, rawDescriptorValue, getOwnPropertyDescriptors(rawDescriptorValue));
                            console.error('need remapping: ', key, rawValue, rawDescriptor);
                            if (ReflectIsExtensible(securePropertyValue)) {
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
}
