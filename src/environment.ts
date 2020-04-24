import { 
    isUndefined,
    WeakMapSet,
    WeakMapGet,
    apply,
    ReflectDefineProperty,
    ReflectGetOwnPropertyDescriptor,
    isFunction,
    ObjectCreate,
    assign,
    emptyArray,
    isTrue,
} from './shared';
import {
    RedObject,
    RedFunction,
    BlueFunction,
    BlueObject,
    RedProxyTarget,
    BlueValue,
    RedValue,
    DistortionMap,
    RedProxy,
    BlueProxy,
    BlueProxyTarget,
} from './types';
import { SandboxRegistry } from './registry';

export class MembraneBroker {
    // map from red to blue references
    redMap: WeakMap<RedFunction | RedObject, RedProxyTarget | BlueProxy>;
    // map from blue to red references
    blueMap: WeakMap<BlueFunction | BlueObject, RedProxy | BlueProxyTarget>;
    // blue object distortion map
    distortionMap: DistortionMap;

    constructor(
        registry: SandboxRegistry,
        blueProxyFactory: (red: RedValue) => BlueValue,
        redProxyFactory: (blue: BlueValue) => RedValue
    ) {
        const { redMap, blueMap, distortionMap } = registry;
        this.redMap = redMap;
        this.blueMap = blueMap;
        this.distortionMap = distortionMap;

        this.getBlueValue = blueProxyFactory(this);
        this.getRedValue = redProxyFactory(this);
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
        const broker = this;
        for (const key in blueDescriptors) {
            if (!canRedPropertyBeTamed(redValue, key)) {
                console.warn(`Property ${key} of ${redValue} cannot be remapped.`);
                continue;
            }
            // avoid poisoning by only installing own properties from blueDescriptors
            const blueDescriptor = assign(ObjectCreate(null), blueDescriptors[key]);
            const redDescriptor = assign(ObjectCreate(null), blueDescriptor);
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

                if (isFunction(blueDescriptor.get)) {
                    const { get: blueGetter } = blueDescriptor;
                    const blueDistortedGetter: () => BlueValue = WeakMapGet(this.distortionMap, blueGetter) || blueGetter;
                    currentBlueGetter = function() {
                        const value: BlueValue = apply(blueDistortedGetter, broker.getBlueValue(this), emptyArray);
                        return broker.getRedValue(value);
                    };
                    redDescriptor.get = function(): RedValue {
                        return apply(currentBlueGetter, this, emptyArray);
                    };
                }

                if (isFunction(blueDescriptor.set)) {
                    redDescriptor.set = function(v: RedValue): void {
                        // if a global setter is invoke, the value will be use as it is as the result of the getter operation
                        currentBlueGetter = () => v;
                    };
                }
            }
            ReflectDefineProperty(redValue, key, redDescriptor);
        }
    }
}

function canRedPropertyBeTamed(redValue: RedValue, key: PropertyKey): boolean {
    const redDescriptor = ReflectGetOwnPropertyDescriptor(redValue, key);
    return isUndefined(redDescriptor) || isTrue(redDescriptor.configurable);
}
