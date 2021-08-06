/* eslint-disable @typescript-eslint/no-use-before-define */
import {
    emptyArray,
    ErrorCtor,
    ObjectDefineProperties,
    ReflectApply,
    ReflectConstruct,
    ReflectGetOwnPropertyDescriptor,
    ReflectOwnKeys,
    RegExpTest,
    WeakMapCtor,
    WeakMapSet,
} from './shared';
import { MarshalHooks, serializedRedEnvSourceText } from './red';
import { blueProxyFactory } from './blue';
import {
    BlueConstructor,
    BlueFunction,
    BlueObject,
    BlueProxy,
    BlueProxyTarget,
    BlueValue,
    MembraneBroker,
    RedFunction,
    RedObject,
    RedProxy,
    RedProxyTarget,
    RedValue,
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
            apply(
                target: BlueFunction,
                thisArgument: BlueValue,
                argumentsList: ArrayLike<BlueValue>
            ): BlueValue {
                return ReflectApply(target, thisArgument, argumentsList);
            },
            construct(
                target: BlueConstructor,
                argumentsList: ArrayLike<BlueValue>,
                newTarget?: any
                // eslint-disable-next-line class-methods-use-this
            ): BlueValue {
                return ReflectConstruct(target, argumentsList, newTarget);
            },
        };
        this.getRedValue = redEnvFactory(this, blueHooks);
        this.getBlueValue = blueProxyFactory(this);
    }

    // istanbul ignore next
    // eslint-disable-next-line class-methods-use-this
    getBlueValue(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        red: RedValue
    ): BlueValue {
        // placeholder since this will be assigned in construction
    }

    // istanbul ignore next
    // eslint-disable-next-line class-methods-use-this
    getRedValue(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        blue: BlueValue
    ): RedValue {
        // placeholder since this will be assigned in construction
    }

    setRefMapEntries(red: RedObject, blue: BlueObject) {
        // double index for perf
        WeakMapSet(this.redMap, red, blue);
        WeakMapSet(this.blueMap, blue, red);
    }

    remap(redValue: RedValue, blueValue: BlueValue, blueDescriptors: PropertyDescriptorMap) {
        const broker = this;
        const keys = ReflectOwnKeys(blueDescriptors);
        const redDescriptors: PropertyDescriptorMap = { __proto__: null } as any;
        for (let i = 0, len = keys.length; i < len; i += 1) {
            const key = keys[i];
            // Skip index keys for magical descriptors of frames on the window proxy.
            if (typeof key !== 'symbol' && RegExpTest(frameGlobalNamesRegExp, key as string)) {
                // eslint-disable-next-line no-continue
                continue;
            }
            if (!canRedPropertyBeTamed(redValue, key)) {
                // eslint-disable-next-line no-console
                console.warn(`Property ${String(key)} of ${redValue} cannot be remapped.`);
                // eslint-disable-next-line no-continue
                continue;
            }
            // Avoid poisoning by only installing own properties from blueDescriptors
            // @ts-expect-error because PropertyDescriptorMap does not accept symbols ATM.
            const blueDescriptor = { __proto__: null, ...blueDescriptors[key] };
            const redDescriptor = { __proto__: null, ...blueDescriptor };
            if ('value' in blueDescriptor) {
                redDescriptor.value = broker.getRedValue(blueDescriptor.value);
            } else {
                // Use the original getter to return a red object, but if the
                // sandbox attempts to set it to a new value, this mutation will
                // only affect the sandbox's global object, and the getter will
                // start returning the new provided value rather than calling onto
                // the blue realm. This is to preserve the object graph of the
                // blue realm.
                // istanbul ignore next
                let currentBlueGetter: (this: RedValue) => RedValue = () => undefined;

                if (typeof blueDescriptor.get === 'function') {
                    const { get: blueGetter } = blueDescriptor;
                    // Note: The reason why we don't use broker.getRedValue here is because we
                    // want that proxy to be lazy. This brings other questions: what about error
                    // control? Do we have test for this? Can we optimize this so after the
                    // first call we don't pay the cost of wrapping anymore?
                    //
                    // TODO: Isn't it easier to just not do any lazy stuff anymore considering
                    // that the creation of those proxies is now faster?
                    const blueDistortedGetter = this.distortionCallback(
                        blueGetter
                    ) as () => BlueValue;
                    currentBlueGetter = function currentDistortedBlueGetter() {
                        const value: BlueValue = ReflectApply(
                            blueDistortedGetter,
                            broker.getBlueValue(this),
                            emptyArray
                        );
                        return broker.getRedValue(value);
                    };
                    redDescriptor.get = function get(): RedValue {
                        return ReflectApply(currentBlueGetter, this, emptyArray);
                    };
                }

                if (typeof blueDescriptor.set === 'function') {
                    redDescriptor.set = function set(v: RedValue): void {
                        // if a global setter is invoke, the value will be use as it
                        // is as the result of the getter operation
                        currentBlueGetter = () => v;
                    };
                }
            }
            // "as any" supresses the "Type 'symbol' cannot be used as an index type."
            redDescriptors[key as any] = redDescriptor;
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
