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
import { serializedRedEnvSourceText, MarshalHooks } from './red';
import { blueProxyFactory } from './blue';
import {
    RedObject,
    RedFunction,
    BlueFunction,
    BlueObject,
    RedProxyTarget,
    BlueValue,
    RedValue,
    BlueConstructor,
    MembraneBroker,
    DistortionMap,
    RedProxy,
    BlueProxy,
    BlueProxyTarget,
} from './types';

interface SecureEnvironmentOptions {
    // Blue global object used by the blue environment
    blueGlobalThis: BlueObject & typeof globalThis;
    // Red global object used by the red environment
    redGlobalThis: RedObject & typeof globalThis;
    // Optional distortion map to tame functionalities observed through the membrane
    distortionMap?: Map<RedProxyTarget, RedProxyTarget>;
}

export class SecureEnvironment implements MembraneBroker {
    // map from red to blue references
    redMap: WeakMap<RedFunction | RedObject, RedProxyTarget | BlueProxy> = WeakMapCreate();
    // map from blue to red references
    blueMap: WeakMap<BlueFunction | BlueObject, RedProxy | BlueProxyTarget> = WeakMapCreate();
    // blue object distortion map
    distortionMap: DistortionMap;

    constructor(options: SecureEnvironmentOptions) {
        if (isUndefined(options)) {
            throw ErrorCreate(`Missing SecureEnvironmentOptions options bag.`);
        }
        const { blueGlobalThis, redGlobalThis, distortionMap } = options;
        this.distortionMap = WeakMapCreate();
        // validating distortion entries
        distortionMap?.forEach((value, key) => {
            if (typeof key !== typeof value) {
                throw ErrorCreate(`Invalid distortion ${value}.`);
            }
            WeakMapSet(this.distortionMap, key, value);
        });
        // getting proxy factories ready per environment so we can produce
        // the proper errors without leaking instances into a sandbox
        const redEnvFactory = redGlobalThis.eval(`(${serializedRedEnvSourceText})`);
        const blueHooks: MarshalHooks = {
            apply(target: BlueFunction, thisArgument: BlueValue, argumentsList: ArrayLike<BlueValue>): BlueValue {
                return apply(target, thisArgument, argumentsList);
            },
            construct(target: BlueConstructor, argumentsList: ArrayLike<BlueValue>, newTarget?: any): BlueValue {
                return construct(target, argumentsList, newTarget);
            },
        };
        this.getRedValue = redEnvFactory(this, blueHooks);
        this.getBlueValue = blueProxyFactory(this);
        // remapping intrinsics that are realm's agnostic
        for (let i = 0, len = ReflectiveIntrinsicObjectNames.length; i < len; i += 1) {
            const name = ReflectiveIntrinsicObjectNames[i];
            const blue = blueGlobalThis[name];
            const red = redGlobalThis[name];
            this.setRefMapEntries(red, blue);
            this.setRefMapEntries(red.prototype, blue.prototype);
        }
    }

    getBlueValue(red: RedValue): BlueValue {
        // placeholder since this will be assigned in construction
    }

    getRedValue(blue: BlueValue): RedValue {
        // placeholder since this will be assigned in construction
    }

    getBlueRef(red: RedValue): BlueValue | undefined {
        const blue: RedValue | undefined = WeakMapGet(this.redMap, red);
        if (!isUndefined(blue)) {
            return blue;
        }
    }

    getRedRef(blue: BlueValue): RedValue | undefined {
        const red: RedValue | undefined = WeakMapGet(this.blueMap, blue);
        if (!isUndefined(red)) {
            return red;
        }
    }

    setRefMapEntries(red: RedObject, blue: BlueObject) {
        // double index for perf
        WeakMapSet(this.redMap, red, blue);
        WeakMapSet(this.blueMap, blue, red);
    }

    remap(redValue: RedValue, blueValue: BlueValue, blueDescriptors: PropertyDescriptorMap) {
        this.setRefMapEntries(redValue, blueValue);
        for (const key in blueDescriptors) {
            // TODO: this whole loop needs cleanup and simplification avoid
            // overriding ECMA script global keys.
            if (SetHas(ESGlobalKeys, key) || !hasOwnProperty(blueDescriptors, key)) {
                continue;
            }

            // avoid poisoning by only installing own properties from blueDescriptors
            const blueDescriptor = assign(ObjectCreate(null), blueDescriptors[key]);
            if ('value' in blueDescriptor) {
                // TODO: maybe we should make everything a getter/setter that way
                // we don't pay the cost of creating the proxy in the first place
                blueDescriptor.value = this.getRedValue(blueDescriptor.value);
            } else {
                // Use the original getter to return a red object, but if the 
                // sandbox attempts to set it to a new value, this mutation will
                // only affect the sandbox's global object, and the getter will
                // start returning the new provided value rather than calling onto
                // the blue realm. This is to preserve the object graph of the
                // blue realm.
                const env = this;
                const { get: originalGetter } = blueDescriptor;

                let currentGetter = () => undefined;
                if (isFunction(originalGetter)) {
                    const originalOrDistortedGetter: () => any = WeakMapGet(this.distortionMap, originalGetter) || originalGetter;
                    currentGetter = function(this: any): RedValue {
                        const value: BlueValue = apply(originalOrDistortedGetter, env.getBlueValue(this), emptyArray);
                        return env.getRedValue(value);
                    };
                }

                blueDescriptor.get = function(): RedValue {
                    return apply(currentGetter, this, emptyArray);
                };

                if (isFunction(blueDescriptor.set)) {
                    blueDescriptor.set = function(v: RedValue): void {
                        // if a global setter is invoke, the value will be use as it is as the result of the getter operation
                        currentGetter = () => v;
                    };
                }
            }

            const redDescriptor = ReflectGetOwnPropertyDescriptor(redValue, key);
            if (!isUndefined(redDescriptor) && 
                    hasOwnProperty(redDescriptor, 'configurable') &&  
                    redDescriptor.configurable === false) {
                const redPropertyValue = redValue[key];
                if (isNullOrUndefined(redPropertyValue)) {
                    continue;
                }
                // this is the case where the red realm has a global descriptor that was supposed to be
                // overrule but can't be done because it is a non-configurable. Instead we try to
                // fallback to some more advanced gymnastics
                if (hasOwnProperty(redDescriptor, 'value')) {
                    // valid proxy target (intentionally ignoring the case of document.all since it is not a value descriptor)
                    if (typeof redPropertyValue === 'function' || typeof redPropertyValue === 'object') {
                        if (!WeakMapHas(this.redMap, redPropertyValue)) {
                            // remapping the value of the red object graph to the blue realm graph
                            const { value: blueDescriptorValue } = blueDescriptor;
                            if (redValue !== blueDescriptorValue) {
                                if (this.getBlueValue(redValue) !== blueValue) {
                                    console.error('need remapping: ',  key, blueValue, blueDescriptor);
                                } else {
                                    // it was already mapped
                                }
                            } else {
                                // window.top is the classic example of a descriptor that leaks access to the blue
                                // window reference, and there is no containment for that case yet.
                                console.error('leaking: ',  key, blueValue, blueDescriptor);
                            }
                        } else {
                            // an example of this is circular window.window ref
                            console.info('circular: ',  key, blueValue, blueDescriptor);
                        }
                    }
                } else if (hasOwnProperty(redDescriptor, 'get')) {
                    // internationally ignoring the case of (typeof document.all === 'undefined') because
                    // it is specified as configurable, you never get one of those exotic objects in this branch
                    if (typeof redPropertyValue === 'function' || typeof redPropertyValue === 'object') {
                        if (redPropertyValue === redValue[key]) {
                            // this is the case for window.document which is identity preserving getter
                            // const blueDescriptorValue = blueValue[key];
                            // this.setRefMapEntries(redDescriptorValue, blueDescriptorValue);
                            // this.installDescriptors(redDescriptorValue, blueDescriptorValue, getOwnPropertyDescriptors(blueDescriptorValue));
                            console.error('need remapping: ', key, blueValue, blueDescriptor);
                            if (ReflectIsExtensible(redPropertyValue)) {
                                // remapping proto chain
                                // ReflectSetPrototypeOf(redDescriptorValue, this.getRedValue(ReflectGetPrototypeOf(redDescriptorValue)));
                                console.error('needs prototype remapping: ', key, blueValue);
                            } else {
                                console.error('leaking prototype: ',  key, blueValue, blueDescriptor);
                            }
                        } else {
                            console.error('leaking a getter returning values without identity: ', key, blueValue, blueDescriptor);
                        }
                    } else {
                        console.error('skipping: ', key, blueValue, blueDescriptor);
                    }
                }
            } else {
                ReflectDefineProperty(redValue, key, blueDescriptor);
            }
        }
    }
}
