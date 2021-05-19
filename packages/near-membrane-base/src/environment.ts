import {
    ErrorCtor,
    ObjectAssign,
    ObjectCreate,
    ObjectDefineProperties,
    ReflectApply,
    ReflectConstruct,
    ReflectGetOwnPropertyDescriptor,
    ReflectOwnKeys,
    RegExpTest,
    WeakMapCtor,
    WeakMapSet,
    WeakMapGet,
    emptyArray,
} from './shared';
import { MarshalHooks, serializedRedEnvSourceText } from './red';
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
    RedProxy,
    BlueProxy,
    BlueProxyTarget,
} from './types';

const frameGlobalNamesRegExp = /^\d+$/;

interface VirtualEnvironmentOptions {
    // Blue global object used by the blue environment
    blueGlobalThis: BlueObject & typeof globalThis;
    // Red global object used by the red environment
    redGlobalThis: RedObject & typeof globalThis;
    // Optional distortion callback to tame functionalities observed through the membrane
    distortionCallback?: (originalTarget: RedProxyTarget) => RedProxyTarget;
}

const distortionDefaultCallback = (v: RedProxyTarget) => v;

export class VirtualEnvironment implements MembraneBroker {
    // map from red to blue references
    redMap: WeakMap<RedFunction | RedObject, RedProxyTarget | BlueProxy> = new WeakMapCtor();
    // map from blue to red references
    blueMap: WeakMap<BlueFunction | BlueObject, RedProxy | BlueProxyTarget> = new WeakMapCtor();
    // blue object distortion map
    distortionCallback: (originalTarget: RedProxyTarget) => RedProxyTarget;

    constructor(options: VirtualEnvironmentOptions) {
        if (options === undefined) {
            throw new ErrorCtor(`Missing VirtualEnvironmentOptions options bag.`);
        }
        const { redGlobalThis, distortionCallback } = options;
        this.distortionCallback = distortionCallback || distortionDefaultCallback;
        // getting proxy factories ready per environment so we can produce
        // the proper errors without leaking instances into a sandbox
        const redEnvFactory = redGlobalThis.eval(`(${serializedRedEnvSourceText})`);
        // Important Note: removing the indirection for apply and construct breaks
        // chrome karma tests for some unknown reasons. What is seems harmless turns out
        // to be fatal, why? it seems that this is because Chrome does identity checks
        // on those intrinsics, and fails if the detached iframe is calling an intrinsic
        // from another realm.
        const blueHooks: MarshalHooks = {
            apply(target: BlueFunction, thisArgument: BlueValue, argumentsList: ArrayLike<BlueValue>): BlueValue {
                return ReflectApply(target, thisArgument, argumentsList);
            },
            construct(target: BlueConstructor, argumentsList: ArrayLike<BlueValue>, newTarget?: any): BlueValue {
                return ReflectConstruct(target, argumentsList, newTarget);
            },
        };
        this.getRedValue = redEnvFactory(this, blueHooks);
        this.getBlueValue = blueProxyFactory(this);
    }

    getBlueValue(red: RedValue): BlueValue {
        // placeholder since this will be assigned in construction
    }

    getRedValue(blue: BlueValue): RedValue {
        // placeholder since this will be assigned in construction
    }

    getBlueRef(red: RedValue): BlueValue | undefined {
        const blue: RedValue | undefined = WeakMapGet(this.redMap, red);
        if (blue !== undefined) {
            return blue;
        }
    }

    getRedRef(blue: BlueValue): RedValue | undefined {
        const red: RedValue | undefined = WeakMapGet(this.blueMap, blue);
        if (red !== undefined) {
            return red;
        }
    }

    setRefMapEntries(red: RedObject, blue: BlueObject) {
        // double index for perf
        WeakMapSet(this.redMap, red, blue);
        WeakMapSet(this.blueMap, blue, red);
    }

    remap(redValue: RedValue, blueValue: BlueValue, blueDescriptors: PropertyDescriptorMap) {
        const broker = this;
        const keys = ReflectOwnKeys(blueDescriptors);
        const redDescriptors = ObjectCreate(null);
        for (let i = 0, len = keys.length; i < len; i += 1) {
            const key = keys[i];
            // Skip index keys for magical descriptors of frames on the window proxy.
            if (typeof key !== 'symbol' && RegExpTest(frameGlobalNamesRegExp, key as string)) {
                continue;
            }
            if (!canRedPropertyBeTamed(redValue, key)) {
                console.warn(`Property ${String(key)} of ${redValue} cannot be remapped.`);
                continue;
            }
            // Avoid poisoning by only installing own properties from blueDescriptors
            // @ts-expect-error because PropertyDescriptorMap does not accept symbols ATM.
            const blueDescriptor = ObjectAssign(ObjectCreate(null), blueDescriptors[key]);
            const redDescriptor = ObjectAssign(ObjectCreate(null), blueDescriptor);
            if ('value' in blueDescriptor) {
                redDescriptor.value = broker.getRedValue(blueDescriptor.value);
            } else {
                // Use the original getter to return a red object, but if the
                // sandbox attempts to set it to a new value, this mutation will
                // only affect the sandbox's global object, and the getter will
                // start returning the new provided value rather than calling onto
                // the blue realm. This is to preserve the object graph of the
                // blue realm.
                let currentBlueGetter: (this: RedValue) => RedValue = () => undefined;

                if (typeof blueDescriptor.get === 'function') {
                    const { get: blueGetter } = blueDescriptor;
                    // Note: the reason why we don't use broker.getRedValue here is because we want that proxy to be
                    // lazy. This brings other questions: what about error control? Do we have test for this?
                    // Can we optimize this so after the first call we don't pay the cost of wrapping anymore?
                    // TODO: isn't easier just to not do any lazy stuff anymore considering that the creation of those
                    // proxies is now faster?
                    const blueDistortedGetter = this.distortionCallback(blueGetter) as () => BlueValue;
                    currentBlueGetter = function() {
                        const value: BlueValue = ReflectApply(blueDistortedGetter, broker.getBlueValue(this), emptyArray);
                        return broker.getRedValue(value);
                    };
                    redDescriptor.get = function(): RedValue {
                        return ReflectApply(currentBlueGetter, this, emptyArray);
                    };
                }

                if (typeof blueDescriptor.set === 'function') {
                    redDescriptor.set = function(v: RedValue): void {
                        // if a global setter is invoke, the value will be use as it is as the result of the getter operation
                        currentBlueGetter = () => v;
                    };
                }
            }
            redDescriptors[key] = redDescriptor;
        }
        // Use `ObjectDefineProperties()` instead of individual
        // `ReflectDefineProperty()` calls for better performance.
        ObjectDefineProperties(redValue, redDescriptors);
    }
}

function canRedPropertyBeTamed(redValue: RedValue, key: PropertyKey): boolean {
    const redDescriptor = ReflectGetOwnPropertyDescriptor(redValue, key);
    // TODO: what about writable - non-configurable?
    return redDescriptor === undefined || redDescriptor.configurable === true;
}
