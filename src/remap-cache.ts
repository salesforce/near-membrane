/**
 * Utility module for SecureEnvironment.remap
 * 
 * The module adds a cache layer for descriptors being remaped from the same originating
 * blue object. Cache entries are factory functions.
 * The factory functions return a remaped descriptor;
 * 
 * Improves performance when multiple similar sandboxes need to be spawned by avoiding
 * if clauses and safety checks
 */
import { WeakMapCreate, WeakMapGet, apply, emptyArray, WeakMapSet } from "./shared";

import { BlueObject, DistortionMap, MembraneBroker } from './types';
import { assign, ObjectCreate } from './shared';

// factory function signature
type FactoryDescriptor = (
    blueDescriptor: PropertyDescriptor,
    broker: MembraneBroker,
    distortionMap: DistortionMap
) => PropertyDescriptor;

// store interface
interface RemapStore {
    cacheValueDescriptor: (propertyKey: PropertyKey) => void,
    cacheGetterOnlyDescriptor: (propertyKey: PropertyKey) => void,
    cacheGetterSetterDescriptor: (propertyKey: PropertyKey) => void,
    get: (propertyKey: PropertyKey) => FactoryDescriptor | undefined
}

// blue objects store
const store: WeakMap<BlueObject, RemapStore> = WeakMapCreate();

/**
 * Returns a RemapStore instance for the blueObject
 * @param blueObject 
 */
export function getInstance(blueObject: BlueObject): RemapStore {
    let cache: RemapStore = WeakMapGet(store, blueObject);

    if (cache) {
        return cache;
    }

    cache = new Cache();

    WeakMapSet(store, blueObject, cache);
    return cache;
}

class Cache implements RemapStore {
    cache: Map<PropertyKey, FactoryDescriptor>

    constructor() {
        this.cache = new Map();
    }

    cacheValueDescriptor(propertyKey: PropertyKey) {
        function factory(blueDescriptor: PropertyDescriptor, broker: MembraneBroker) {
            const redDescriptor = assign(ObjectCreate(null), blueDescriptor);
            redDescriptor.value = broker.getRedValue(blueDescriptor.value);

            return redDescriptor;
        }

        this.cache.set(propertyKey, factory);
    }

    cacheGetterOnlyDescriptor(propertyKey: PropertyKey) {
        function factory(blueDescriptor: PropertyDescriptor, broker: MembraneBroker, distortionMap: DistortionMap) {
            const { get: blueGetter } = blueDescriptor;
            const blueDistortedGetter = WeakMapGet(distortionMap, blueGetter) || blueGetter;
            const redDescriptor = assign(ObjectCreate(null), blueDescriptor);

            redDescriptor.get = function () {
                const value = apply(blueDistortedGetter, broker.getBlueValue(this), emptyArray);
                return broker.getRedValue(value);
            }

            return redDescriptor;
        }

        this.cache.set(propertyKey, factory);
    }

    cacheGetterSetterDescriptor(propertyKey: PropertyKey) {
        function factory(blueDescriptor: PropertyDescriptor, broker: MembraneBroker, distortionMap: DistortionMap) {
            const { get: blueGetter } = blueDescriptor;
            const blueDistortedGetter = WeakMapGet(distortionMap, blueGetter) || blueGetter;
            const redDescriptor = assign(ObjectCreate(null), blueDescriptor);

            let currentBlueGetter = function (this: any) {
                const value = apply(blueDistortedGetter, broker.getBlueValue(this), emptyArray);
                return broker.getRedValue(value);
            }

            redDescriptor.get = function () {
                return apply(currentBlueGetter, this, emptyArray);
            }

            redDescriptor.set = function (v: any) {
                currentBlueGetter = () => v;
            }

            return redDescriptor;
        }

        this.cache.set(propertyKey, factory);
    };

    get(propertyKey: PropertyKey) {
        return this.cache.get(propertyKey);
    }
}
