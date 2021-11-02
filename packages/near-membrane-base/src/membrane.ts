/**
 * This file contains an exportable (portable) function `init` used to initialize
 * one side of a membrane on any realm. The only prerequisite is the ability to evaluate
 * the sourceText of the `init` function there. Once evaluated, the function will return
 * a set of values that can be used to wire up the side of the membrane with another
 * existing `init` function from another realm, in which case they will exchange
 * callable functions that are required to connect the two realms via the membrane.
 *
 * About the mechanics of the membrane, there are few important considerations:
 *
 * 1. Pointers are the way to pass reference to object and functions.
 * 2. A dedicated symbol (UNDEFINED_SYMBOL) is needed to represent the absence of a value.
 * 3. The realm that owns the object or function is responsible for projecting the proxy
 *    onto the other side (via callablePushTarget), which returns a Pointer that can be
 *    used by the realm to pass the reference to the same proxy over and over again.
 * 4. The realm that owns the proxy (after the other side projects it into it) will hold
 *    a Pointer alongside the proxy to signal what original object or function should
 *    the foreign operation operates, it is always the first argument of the foreign
 *    callable for proxies, and the other side can use it via `getSelectedTarget`.
 */

import { InstrumentationHooks } from './instrumentation';

const { setPrototypeOf: ReflectSetPrototypeOf } = Reflect;

export type Pointer = CallableFunction;
type Primitive = bigint | boolean | null | number | string | symbol | undefined;
type PointerOrPrimitive = Pointer | Primitive;
export type ProxyTarget = CallableFunction | any[] | object;
type ShadowTarget = CallableFunction | any[] | object;
type CallablePushTarget = (
    pointer: () => void,
    targetTraits: number,
    targetFunctionName: string | undefined
) => Pointer;
type CallableApply = (
    targetPointer: Pointer,
    thisArgPointerOrValue: PointerOrPrimitive,
    ...listOfValuesOrPointers: PointerOrPrimitive[]
) => PointerOrPrimitive;
type CallableConstruct = (
    targetPointer: Pointer,
    newTargetPointer: PointerOrPrimitive,
    ...listOfValuesOrPointers: PointerOrPrimitive[]
) => PointerOrPrimitive;
export type CallableDefineProperty = (
    targetPointer: Pointer,
    key: string | symbol,
    configurable: boolean | symbol,
    enumerable: boolean | symbol,
    writable: boolean | symbol,
    valuePointer: PointerOrPrimitive,
    getPointer: PointerOrPrimitive,
    setPointer: PointerOrPrimitive
) => boolean;
type CallableDeleteProperty = (targetPointer: Pointer, key: string | symbol) => boolean;
type CallableDescriptorCallback = (
    configurable: boolean | symbol,
    enumerable: boolean | symbol,
    writable: boolean | symbol,
    valuePointer: PointerOrPrimitive,
    getPointer: PointerOrPrimitive,
    setPointer: PointerOrPrimitive
) => void;
type CallableGetOwnPropertyDescriptor = (
    targetPointer: Pointer,
    key: string | symbol,
    foreignCallableDescriptorCallback: CallableDescriptorCallback
) => void;
type CallableGetPrototypeOf = (targetPointer: Pointer) => PointerOrPrimitive;
type CallableIsExtensible = (targetPointer: Pointer) => boolean;
type CallableOwnKeys = (
    targetPointer: Pointer,
    foreignCallableKeysCallback: (...args: ReturnType<typeof Reflect.ownKeys>) => void
) => void;
type CallablePreventExtensions = (targetPointer: Pointer) => boolean;
type CallableSet = (
    targetPointer: Pointer,
    propertyKey: PropertyKey,
    value: any,
    receiver?: any
) => boolean;
export type CallableSetPrototypeOf = (
    targetPointer: Pointer,
    protoPointerOrNull: Pointer | null
) => boolean;
type CallableGetTargetIntegrityTraits = (targetPointer: Pointer) => number;
type CallableHasOwnProperty = (targetPointer: Pointer, key: string | symbol) => boolean;
type CallableGetUnbrandedTag = (targetPointer: Pointer) => string | undefined;
export type CallableLinkPointers = (targetPointer: Pointer, foreignTargetPointer: Pointer) => void;
export type CallableGetPropertyValuePointer = (
    targetPointer: Pointer,
    key: string | symbol
) => Pointer;
export type CallableEvaluate = (sourceText: string) => PointerOrPrimitive;
export type GetTransferableValue = (value: any) => PointerOrPrimitive;
export type GetSelectedTarget = () => any;
export type HooksCallback = (
    globalThisPointer: Pointer,
    getSelectedTarget: GetSelectedTarget,
    getTransferableValue: GetTransferableValue,
    callableGetPropertyValuePointer: CallableGetPropertyValuePointer,
    callableEvaluate: CallableEvaluate,
    callableLinkPointers: CallableLinkPointers,
    callablePushTarget: CallablePushTarget,
    callableApply: CallableApply,
    callableConstruct: CallableConstruct,
    callableDefineProperty: CallableDefineProperty,
    callableDeleteProperty: CallableDeleteProperty,
    callableGetOwnPropertyDescriptor: CallableGetOwnPropertyDescriptor,
    callableGetPrototypeOf: CallableGetPrototypeOf,
    callableIsExtensible: CallableIsExtensible,
    callableOwnKeys: CallableOwnKeys,
    callablePreventExtensions: CallablePreventExtensions,
    callableSet: CallableSet,
    callableSetPrototypeOf: CallableSetPrototypeOf,
    callableGetTargetIntegrityTraits: CallableGetTargetIntegrityTraits,
    callableGetUnbrandedTag: CallableGetUnbrandedTag,
    callableHasOwnProperty: CallableHasOwnProperty
) => void;
export type DistortionCallback = (target: ProxyTarget) => ProxyTarget;
export interface InitLocalOptions {
    distortionCallback?: DistortionCallback;
    instrumentation?: InstrumentationHooks;
}
// eslint-disable-next-line no-shadow
export enum SupportFlagsEnum {
    None = 0,
    MagicMarker = 1 << 0,
}
ReflectSetPrototypeOf(SupportFlagsEnum, null);

// istanbul ignore next
export function createMembraneMarshall() {
    const ArrayCtor = Array;
    const { isArray: isArrayOrNotOrThrowForRevoked } = Array;
    const {
        defineProperties: ObjectDefineProperties,
        freeze: ObjectFreeze,
        isFrozen: ObjectIsFrozen,
        isSealed: ObjectIsSealed,
        seal: ObjectSeal,
    } = Object;
    const { hasOwnProperty: ObjectProtoHasOwnProperty, toString: ObjectProtoToString } =
        Object.prototype;
    const { revocable: ProxyRevocable } = Proxy;
    const {
        apply: ReflectApply,
        construct: ReflectConstruct,
        defineProperty: ReflectDefineProperty,
        deleteProperty: ReflectDeleteProperty,
        get: ReflectGet,
        getOwnPropertyDescriptor: ReflectGetOwnPropertyDescriptor,
        getPrototypeOf: ReflectGetPrototypeOf,
        has: ReflectHas,
        isExtensible: ReflectIsExtensible,
        ownKeys: ReflectOwnKeys,
        preventExtensions: ReflectPreventExtensions,
        set: ReflectSet,
        // eslint-disable-next-line @typescript-eslint/no-shadow, no-shadow
        setPrototypeOf: ReflectSetPrototypeOf,
    } = Reflect;
    const { slice: StringProtoSlice } = String.prototype;
    const TypeErrorCtor = TypeError;
    const { get: WeakMapProtoGet, set: WeakMapProtoSet } = WeakMap.prototype;

    if (typeof globalThis === 'undefined') {
        // Polyfill globalThis for environments like Android emulators
        // running Chrome 69. See https://mathiasbynens.be/notes/globalthis
        // for more details.
        ReflectDefineProperty(Object.prototype, 'globalThis', {
            // @ts-ignore: TS doesn't like __proto__ on property descriptors.
            __proto__: null,
            configurable: true,
            get() {
                // Safari 12 on iOS 12.1 has a `this` of `undefined` so we
                // fallback to `self`.
                // eslint-disable-next-line no-restricted-globals
                const result = this || self;
                ReflectDeleteProperty(Object.prototype, 'globalThis');
                ReflectDefineProperty(result, 'globalThis', {
                    // @ts-ignore: TS doesn't like __proto__ on property descriptors.
                    __proto__: null,
                    configurable: true,
                    value: result,
                });
                return result;
            },
        });
    }
    const { eval: cachedLocalEval } = globalThis;

    // @rollup/plugin-replace replaces `DEV_MODE` references.
    const DEV_MODE = true;
    const LOCKER_LIVE_MARKER_SYMBOL = Symbol.for('@@lockerLiveValue');
    const LOCKER_MAGIC_MARKER_SYMBOL = Symbol.for('@@lockerMagicValue');
    const { toStringTag: TO_STRING_TAG_SYMBOL } = Symbol;
    const UNDEFINED_SYMBOL = Symbol.for('@@membraneUndefinedValue');

    // eslint-disable-next-line no-shadow
    enum MarshallSupportFlagsField {
        None = 0,
        MagicMarker = 1 << 0,
    }
    ReflectSetPrototypeOf(MarshallSupportFlagsField, null);
    // eslint-disable-next-line no-shadow
    enum TargetIntegrityTraits {
        None = 0,
        IsNotExtensible = 1 << 0,
        IsSealed = 1 << 1,
        IsFrozen = 1 << 2,
        Revoked = 1 << 4,
    }
    ReflectSetPrototypeOf(TargetIntegrityTraits, null);
    // eslint-disable-next-line no-shadow
    enum TargetTraits {
        None = 0,
        IsArray = 1 << 0,
        IsFunction = 1 << 1,
        IsObject = 1 << 2,
        IsArrowFunction = 1 << 3,
        Revoked = 1 << 4,
    }
    ReflectSetPrototypeOf(TargetTraits, null);

    return function createHooksCallback(
        color: string,
        trapMutations: boolean,
        supportFlags: SupportFlagsEnum = SupportFlagsEnum.None,
        foreignCallableHooksCallback: HooksCallback,
        options?: InitLocalOptions
    ): HooksCallback {
        const { distortionCallback = (o: ProxyTarget) => o, instrumentation } = options || {
            __proto__: null,
        };

        const proxyTargetToPointerMap = new WeakMap();

        const INBOUND_INSTRUMENTATION_LABEL = `to:${color}`;
        const OUTBOUND_INSTRUMENTATION_LABEL = `from:${color}`;
        const SUPPORT_MAGIC_MARKER = !!(supportFlags & MarshallSupportFlagsField.MagicMarker);

        let foreignCallablePushTarget: CallablePushTarget;
        let foreignCallableApply: CallableApply;
        let foreignCallableConstruct: CallableConstruct;
        let foreignCallableDefineProperty: CallableDefineProperty;
        let foreignCallableDeleteProperty: CallableDeleteProperty;
        let foreignCallableGetOwnPropertyDescriptor: CallableGetOwnPropertyDescriptor;
        let foreignCallableGetPrototypeOf: CallableGetPrototypeOf;
        let foreignCallableIsExtensible: CallableIsExtensible;
        let foreignCallableOwnKeys: CallableOwnKeys;
        let foreignCallablePreventExtensions: CallablePreventExtensions;
        let foreignCallableSet: CallableSet;
        let foreignCallableSetPrototypeOf: CallableSetPrototypeOf;
        let foreignCallableGetTargetIntegrityTraits: CallableGetTargetIntegrityTraits;
        let foreignCallableGetUnbrandedTag: CallableGetUnbrandedTag;
        let foreignCallableHasOwnProperty: CallableHasOwnProperty;
        let selectedTarget: undefined | ProxyTarget;

        function copyForeignDescriptorsIntoShadowTarget(
            shadowTarget: ShadowTarget,
            foreignTargetPointer: Pointer
        ) {
            let keys: ReturnType<typeof Reflect.ownKeys> = [];
            foreignCallableOwnKeys(foreignTargetPointer, (...args) => {
                keys = args;
            });
            const descriptors: PropertyDescriptorMap = {};
            let safeDesc: PropertyDescriptor;
            const callbackWithDescriptor: CallableDescriptorCallback = (
                configurable,
                enumerable,
                writable,
                valuePointer,
                getPointer,
                setPointer
            ) => {
                safeDesc = createDescriptorFromMeta(
                    configurable,
                    enumerable,
                    writable,
                    valuePointer,
                    getPointer,
                    setPointer
                );
            };
            for (let i = 0, len = keys.length; i < len; i += 1) {
                const key = keys[i] as string | symbol;
                foreignCallableGetOwnPropertyDescriptor(
                    foreignTargetPointer,
                    key,
                    callbackWithDescriptor
                );
                if (safeDesc!) {
                    (descriptors as any)[key] = safeDesc;
                }
            }
            // Use `ObjectDefineProperties` instead of individual
            // `ReflectDefineProperty` calls for better performance.
            ObjectDefineProperties(shadowTarget, descriptors);
        }

        // metadata is the transferable descriptor definition
        function createDescriptorFromMeta(
            configurable: boolean | symbol,
            enumerable: boolean | symbol,
            writable: boolean | symbol,
            valuePointer: PointerOrPrimitive,
            getPointer: PointerOrPrimitive,
            setPointer: PointerOrPrimitive
        ): PropertyDescriptor {
            // @ts-ignore: TS doesn't like __proto__ on property descriptors.
            const safeDesc: PropertyDescriptor = { __proto__: null };
            if (configurable !== UNDEFINED_SYMBOL) {
                safeDesc.configurable = !!configurable;
            }
            if (enumerable !== UNDEFINED_SYMBOL) {
                safeDesc.enumerable = !!enumerable;
            }
            if (writable !== UNDEFINED_SYMBOL) {
                safeDesc.writable = !!writable;
            }
            if (getPointer !== UNDEFINED_SYMBOL) {
                safeDesc.get = getLocalValue(getPointer);
            }
            if (setPointer !== UNDEFINED_SYMBOL) {
                safeDesc.set = getLocalValue(setPointer);
            }
            if (valuePointer !== UNDEFINED_SYMBOL) {
                safeDesc.value = getLocalValue(valuePointer);
            }
            return safeDesc;
        }

        function createPointer(originalTarget: ProxyTarget): () => void {
            // assert: originalTarget is a ProxyTarget
            const pointer = (): void => {
                // assert: selectedTarget is undefined
                selectedTarget = originalTarget;
            };
            if (DEV_MODE) {
                // In case debugging is needed, the following lines can help:
                pointer['[[OriginalTarget]]'] = originalTarget;
                pointer['[[Color]]'] = color;
            }
            return pointer;
        }

        function createShadowTarget(
            targetTraits: TargetTraits,
            targetFunctionName: string | undefined
        ): ShadowTarget {
            let shadowTarget: ShadowTarget;
            if (targetTraits & TargetTraits.IsFunction) {
                // This shadow target is never invoked. It's needed to avoid
                // proxy trap invariants. Because it's not invoked the code does
                // not need to be instrumented for code coverage.
                //
                // istanbul ignore next
                shadowTarget =
                    // eslint-disable-next-line func-names
                    targetTraits & TargetTraits.IsArrowFunction ? () => {} : function () {};
                if (DEV_MODE) {
                    // This is only really needed for debugging,
                    // it helps to identify the proxy by name
                    ReflectDefineProperty(shadowTarget, 'name', {
                        // @ts-ignore: TS doesn't like __proto__ on property descriptors.
                        __proto__: null,
                        configurable: true,
                        enumerable: false,
                        value: targetFunctionName,
                        writable: false,
                    });
                }
            } else {
                // target is array or object
                shadowTarget = targetTraits & TargetTraits.IsArray ? [] : {};
            }
            return shadowTarget;
        }

        // this is needed even when using ShadowRealm, because the errors are not going
        // to cross the callable boundary in a try/catch, instead, they need to be ported
        // via the membrane artifacts.
        function foreignErrorControl<T extends (...args: any[]) => any>(foreignFn: T): T {
            return <T>function foreignErrorControlFn(this: any, ...args: any[]): any {
                try {
                    return ReflectApply(foreignFn, this, args);
                } catch (e: any) {
                    const pushedError = getSelectedTarget();
                    if (pushedError) {
                        throw pushedError;
                    }
                    throw new TypeErrorCtor(e?.message);
                }
            };
        }

        function getDescriptorMeta(
            unsafePartialDesc: PropertyDescriptor
        ): Parameters<CallableDescriptorCallback> {
            const safePartialDesc = toSafeDescriptor(unsafePartialDesc);
            const { configurable, enumerable, writable, value, get, set } = safePartialDesc;
            return [
                'configurable' in safePartialDesc ? !!configurable : UNDEFINED_SYMBOL,
                'enumerable' in safePartialDesc ? !!enumerable : UNDEFINED_SYMBOL,
                'writable' in safePartialDesc ? !!writable : UNDEFINED_SYMBOL,
                'value' in safePartialDesc ? getTransferableValue(value) : UNDEFINED_SYMBOL,
                'get' in safePartialDesc ? getTransferableValue(get) : UNDEFINED_SYMBOL,
                'set' in safePartialDesc ? getTransferableValue(set) : UNDEFINED_SYMBOL,
            ];
        }

        function getDistortedValue(target: ProxyTarget): ProxyTarget {
            let distortedTarget: ProxyTarget | undefined;
            try {
                distortedTarget = distortionCallback(target);
                return distortedTarget;
            } finally {
                // if a distortion entry is found, it must be a valid proxy target
                if (distortedTarget !== target && typeof distortedTarget !== typeof target) {
                    // eslint-disable-next-line no-unsafe-finally
                    throw new TypeErrorCtor(`Invalid distortion ${target}.`);
                }
            }
        }

        function getInheritedPropertyDescriptor(
            foreignTargetPointer: Pointer,
            key: string | symbol
        ): PropertyDescriptor | undefined {
            // Avoiding calling the has trap for any proto chain operation,
            // instead we implement the regular logic here in this trap.
            let currentObject = liveGetPrototypeOf(foreignTargetPointer);
            while (currentObject) {
                const unsafeParentDesc = ReflectGetOwnPropertyDescriptor(currentObject, key);
                if (unsafeParentDesc) {
                    return toSafeDescriptor(unsafeParentDesc);
                }
                currentObject = ReflectGetPrototypeOf(currentObject);
            }
            return undefined;
        }

        function getLocalValue(pointerOrPrimitive: PointerOrPrimitive): any {
            if (typeof pointerOrPrimitive === 'function') {
                pointerOrPrimitive();
                return getSelectedTarget();
            }
            return pointerOrPrimitive;
        }

        function getSelectedTarget(): any {
            // assert: selectedTarget is a ProxyTarget
            const result = selectedTarget;
            selectedTarget = undefined;
            return result;
        }

        function getTargetTraits(target: object): TargetTraits {
            let targetTraits = TargetTraits.None;
            if (typeof target === 'function') {
                targetTraits |= TargetTraits.IsFunction;
                // detecting arrow function vs function
                try {
                    targetTraits |= +!('prototype' in target) && TargetTraits.IsArrowFunction;
                } catch {
                    // target is either a revoked proxy, or a proxy that
                    // throws on the `has` trap, in which case going with
                    // a strict mode function seems appropriate.
                }
            } else {
                let targetIsArray = false;
                try {
                    // try/catch in case Array.isArray throws when target
                    // is a revoked proxy
                    targetIsArray = isArrayOrNotOrThrowForRevoked(target);
                } catch {
                    // TODO: this might be problematic, because functions
                    // and arrow functions should also be subject to this,
                    // but it seems that we can still create a proxy of
                    // a revoke, and wait until the user-land code actually
                    // access something out of it to throw the proper error.
                    // target is a revoked proxy, so the type doesn't matter
                    // much from this point on
                    targetTraits |= TargetTraits.Revoked;
                }
                targetTraits |= +targetIsArray && TargetTraits.IsArray;
                targetTraits |= +!targetIsArray && TargetTraits.IsObject;
            }
            return targetTraits;
        }

        function getTargetIntegrityTraits(target: object): TargetIntegrityTraits {
            let targetIntegrityTraits = TargetIntegrityTraits.None;
            try {
                // a revoked proxy will break the membrane when reading the meta
                if (ObjectIsFrozen(target)) {
                    targetIntegrityTraits |=
                        TargetIntegrityTraits.IsSealed &
                        TargetIntegrityTraits.IsFrozen &
                        TargetIntegrityTraits.IsNotExtensible;
                } else if (ObjectIsSealed(target)) {
                    targetIntegrityTraits |= TargetIntegrityTraits.IsSealed;
                } else if (!ReflectIsExtensible(target)) {
                    targetIntegrityTraits |= TargetIntegrityTraits.IsNotExtensible;
                }
                // if the target was revoked or become revoked during the extraction
                // of the metadata, we mark it as broken in the catch.
                isArrayOrNotOrThrowForRevoked(target);
            } catch {
                // intentionally swallowing the error because this method is just
                // extracting the metadata in a way that it should always succeed
                // except for the cases in which the target is a proxy that is
                // either revoked or has some logic that is incompatible with the
                // membrane, in which case we will just create the proxy for the
                // membrane but revoke it right after to prevent any leakage.
                targetIntegrityTraits |= TargetIntegrityTraits.Revoked;
            }
            return targetIntegrityTraits;
        }

        function getTransferablePointer(originalTarget: ProxyTarget): Pointer {
            let proxyPointer = ReflectApply(WeakMapProtoGet, proxyTargetToPointerMap, [
                originalTarget,
            ]);
            if (proxyPointer) {
                return proxyPointer;
            }
            const distortedTarget = getDistortedValue(originalTarget);
            // the closure works as the implicit WeakMap
            const targetPointer = createPointer(distortedTarget);
            const targetTraits = getTargetTraits(distortedTarget);
            let targetFunctionName: string | undefined;
            if (typeof originalTarget === 'function') {
                try {
                    // a revoked proxy will throw when reading the function name
                    const unsafeDesc = ReflectGetOwnPropertyDescriptor(originalTarget, 'name');
                    if (unsafeDesc) {
                        const safeDesc = toSafeDescriptor(unsafeDesc);
                        targetFunctionName = safeDesc.value;
                    }
                } catch {
                    // intentionally swallowing the error because this method is just extracting
                    // the function in a way that it should always succeed except for the cases
                    // in which the provider is a proxy that is either revoked or has some logic
                    // to prevent reading the name property descriptor.
                }
            }
            proxyPointer = foreignCallablePushTarget(
                targetPointer,
                targetTraits,
                targetFunctionName
            );

            // the WeakMap is populated with the original target rather then the distorted one
            // while the pointer always uses the distorted one.
            // TODO: this mechanism poses another issue, which is that the return value of
            // getSelectedTarget() can never be used to call across the membrane because that
            // will cause a wrapping around the potential distorted value instead of the original
            // value. This is not fatal, but implies that for every distorted value where will
            // two proxies that are not ===, which is weird. Guaranteeing this is not easy because
            // it means auditing the code.
            ReflectApply(WeakMapProtoSet, proxyTargetToPointerMap, [originalTarget, proxyPointer]);
            return proxyPointer;
        }

        function getTransferableValue(value: any): PointerOrPrimitive {
            // Internationally ignoring the case of (typeof document.all === 'undefined')
            // because in the reserve membrane, you never get one of those exotic objects.
            if (typeof value === 'undefined') {
                return undefined;
            }
            // TODO: What other ways to optimize this method?
            if (value === null || (typeof value !== 'function' && typeof value !== 'object')) {
                return value;
            }
            return getTransferablePointer(value);
        }

        // This wrapping mechanism provides the means to add instrumentation
        // to the callable functions used to coordinate work between the sides
        // of the membrane.
        // TODO: do we need to pass more info into instrumentation hooks?
        // prettier-ignore
        function instrumentCallableWrapper<T extends (...args: any[]) => any>(
            fn: T,
            activityName: string,
            crossingDirection: string): T {
            if (instrumentation) {
                return <T>function instrumentedFn(this: any, ...args: any[]): any {
                    const activity = instrumentation.startActivity(activityName, {
                        crossingDirection
                    });
                    try {
                        return ReflectApply(fn, this, args);
                    } catch (e: any) {
                        activity.error(e);
                        throw e;
                    } finally {
                        activity.stop();
                    }
                };
            }
            return fn;
        }

        /**
         * An object is marked as a "live" object when it has a
         * LOCKER_LIVE_MARKER_SYMBOL property. Live objects have their
         * defineProperty, deleteProperty, preventExtensions, set, and
         * setPrototypeOf proxy traps as "live" variations meaning that when
         * mutation occurs instead of maintaining a separate object graph of
         * changes the mutations are performed directly on the foreign target.
         *
         */
        function isForeignTargetMarkedLive(foreignTargetPointer: Pointer): boolean {
            return foreignCallableHasOwnProperty(foreignTargetPointer, LOCKER_LIVE_MARKER_SYMBOL);
        }

        /**
         * An object is marked as a "magic" object when it has a
         * LOCKER_MAGIC_MARKER_SYMBOL property. These objects have magical side
         * effects when setting properties, which would be broken by a Define
         * Property operation. For example, the `style` object of an HTMLElement
         * in Safari <= 14. This marker is a signal to the membrane that it must
         * use a Set operation, instead of a Define Property operation.
         *
         */
        function isMarkedMagic(object: object): boolean {
            return (
                SUPPORT_MAGIC_MARKER &&
                ReflectApply(ObjectProtoHasOwnProperty, object, [LOCKER_MAGIC_MARKER_SYMBOL])
            );
        }

        function liveDefineProperty(
            foreignTargetPointer: Pointer,
            shadowTarget: ShadowTarget,
            key: string | symbol,
            unsafePartialDesc: PropertyDescriptor
        ): ReturnType<typeof Reflect.defineProperty> {
            const descMeta = getDescriptorMeta(unsafePartialDesc);
            const result = foreignCallableDefineProperty(
                foreignTargetPointer,
                key,
                descMeta[0], // configurable
                descMeta[1], // enumerable
                descMeta[2], // writable
                descMeta[3], // valuePointer
                descMeta[4], // getPointer
                descMeta[5] // setPointer
            );
            if (result) {
                // Intentionally testing against false since it could be
                // undefined as well
                if (descMeta[0] /* configurable */ === false) {
                    foreignCallableGetOwnPropertyDescriptor(
                        foreignTargetPointer,
                        key,
                        (
                            configurable,
                            enumerable,
                            writable,
                            valuePointer,
                            getPointer,
                            setPointer
                        ) => {
                            ReflectDefineProperty(
                                shadowTarget,
                                key,
                                createDescriptorFromMeta(
                                    configurable,
                                    enumerable,
                                    writable,
                                    valuePointer,
                                    getPointer,
                                    setPointer
                                )
                            );
                        }
                    );
                }
            }
            return result;
        }

        function liveDeleteProperty(
            foreignTargetPointer: Pointer,
            _shadowTarget: ShadowTarget,
            key: string | symbol
        ): ReturnType<typeof Reflect.deleteProperty> {
            return foreignCallableDeleteProperty(foreignTargetPointer, key);
        }

        function liveGet(
            foreignTargetPointer: Pointer,
            shadowTarget: ShadowTarget,
            key: string | symbol,
            receiver: any
        ): any {
            const safeDesc =
                liveGetOwnPropertyDescriptor(foreignTargetPointer, shadowTarget, key) ||
                getInheritedPropertyDescriptor(foreignTargetPointer, key);

            if (safeDesc) {
                const { get: getter, value: localValue } = safeDesc;
                if (getter) {
                    // Even though the getter function exists, we can't use
                    // `ReflectGet` because there might be a distortion for
                    // that getter function, in which case we must resolve
                    // the local getter and call it instead.
                    return ReflectApply(getter, receiver, []);
                }
                return localValue;
            }
            if (key === TO_STRING_TAG_SYMBOL) {
                return foreignCallableGetUnbrandedTag(foreignTargetPointer);
            }
            return undefined;
        }

        function liveGetOwnPropertyDescriptor(
            foreignTargetPointer: Pointer,
            shadowTarget: ShadowTarget,
            key: string | symbol
        ): ReturnType<typeof Reflect.getOwnPropertyDescriptor> {
            let safeDesc: PropertyDescriptor | undefined;
            foreignCallableGetOwnPropertyDescriptor(
                foreignTargetPointer,
                key,
                (configurable, enumerable, writable, valuePointer, getPointer, setPointer) => {
                    safeDesc = createDescriptorFromMeta(
                        configurable,
                        enumerable,
                        writable,
                        valuePointer,
                        getPointer,
                        setPointer
                    );
                    if (safeDesc.configurable === false) {
                        // updating the descriptor to non-configurable on the shadow
                        ReflectDefineProperty(shadowTarget, key, safeDesc);
                    }
                }
            );
            return safeDesc;
        }

        function liveGetPrototypeOf(
            foreignTargetPointer: Pointer
        ): ReturnType<typeof Reflect.getPrototypeOf> {
            return getLocalValue(foreignCallableGetPrototypeOf(foreignTargetPointer));
        }

        function liveHas(
            foreignTargetPointer: Pointer,
            key: string | symbol
        ): ReturnType<typeof Reflect.has> {
            if (foreignCallableHasOwnProperty(foreignTargetPointer, key)) {
                return true;
            }
            // Avoiding calling the has trap for any proto chain operation,
            // instead we implement the regular logic here in this trap.
            let currentObject = liveGetPrototypeOf(foreignTargetPointer);
            while (currentObject) {
                if (ReflectApply(ObjectProtoHasOwnProperty, currentObject, [key])) {
                    return true;
                }
                currentObject = ReflectGetPrototypeOf(currentObject);
            }
            return false;
        }

        function liveIsExtensible(
            foreignTargetPointer: Pointer,
            shadowTarget: ShadowTarget
        ): ReturnType<typeof Reflect.isExtensible> {
            // check if already locked
            if (ReflectIsExtensible(shadowTarget)) {
                if (foreignCallableIsExtensible(foreignTargetPointer)) {
                    return true;
                }
                lockShadowTarget(shadowTarget, foreignTargetPointer);
            }
            return false;
        }

        function liveOwnKeys(foreignTargetPointer: Pointer): ReturnType<typeof Reflect.ownKeys> {
            let keys: ReturnType<typeof Reflect.ownKeys>;
            foreignCallableOwnKeys(foreignTargetPointer, (...args) => {
                keys = args;
            });
            // @ts-ignore: Prevent used before assignment error.
            return keys || [];
        }

        function livePreventExtensions(
            foreignTargetPointer: Pointer,
            shadowTarget: ShadowTarget
        ): ReturnType<typeof Reflect.preventExtensions> {
            if (ReflectIsExtensible(shadowTarget)) {
                if (!foreignCallablePreventExtensions(foreignTargetPointer)) {
                    // if the target is a proxy manually created, it might
                    // reject the preventExtension call, in which case we
                    // should not attempt to lock down the shadow target.
                    if (!foreignCallableIsExtensible(foreignTargetPointer)) {
                        lockShadowTarget(shadowTarget, foreignTargetPointer);
                    }
                    return false;
                }
                lockShadowTarget(shadowTarget, foreignTargetPointer);
            }
            return true;
        }

        function liveSet(
            foreignTargetPointer: Pointer,
            shadowTarget: ShadowTarget,
            key: string | symbol,
            value: any,
            receiver: any,
            useFastPath: boolean
        ): boolean {
            // Following the specification steps for
            // OrdinarySetWithOwnDescriptor ( O, P, V, Receiver, ownDesc ).
            // https://tc39.es/ecma262/#sec-ordinarysetwithowndescriptor
            const safeOwnDesc = liveGetOwnPropertyDescriptor(
                foreignTargetPointer,
                shadowTarget,
                key
            );
            const safeDesc =
                safeOwnDesc || getInheritedPropertyDescriptor(foreignTargetPointer, key);
            if (safeDesc) {
                if ('get' in safeDesc || 'set' in safeDesc) {
                    const { set: setter } = safeDesc;
                    if (setter) {
                        // Even though the setter function exists, we can't use
                        // `ReflectSet` because there might be a distortion for
                        // that setter function, in which case we must resolve
                        // the local setter and call it instead.
                        ReflectApply(setter, receiver, [value]);
                        // If there is a setter, it either throw or we can assume
                        // the value was set.
                        return true;
                    }
                    return false;
                }
                if (safeDesc.writable === false) {
                    return false;
                }
            }
            let safeReceiverDesc: PropertyDescriptor | undefined;
            if (useFastPath) {
                // In the fast path we know the receiver is the proxy.
                safeReceiverDesc = safeOwnDesc;
            } else {
                // Exit early if receiver is not object like.
                if (
                    receiver === null ||
                    (typeof receiver !== 'function' && typeof receiver !== 'object')
                ) {
                    return false;
                }
                const unsafeReceiverDesc = ReflectGetOwnPropertyDescriptor(receiver, key);
                if (unsafeReceiverDesc) {
                    safeReceiverDesc = toSafeDescriptor(unsafeReceiverDesc);
                }
            }
            if (safeReceiverDesc) {
                // Exit early for accessor descriptors or non-writable data
                // descriptors.
                if (
                    'get' in safeReceiverDesc ||
                    'set' in safeReceiverDesc ||
                    safeReceiverDesc.writable === false
                ) {
                    return false;
                }
                if (isMarkedMagic(receiver)) {
                    // Workaround for Safari <= 14 bug on CSSStyleDeclaration
                    // objects which lose their magic setters if set with
                    // defineProperty.
                    foreignCallableSet(
                        foreignTargetPointer,
                        key,
                        getTransferableValue(value),
                        getTransferablePointer(receiver)
                    );
                } else {
                    // Setting the descriptor with only a value entry should not
                    // affect existing descriptor traits.
                    ReflectDefineProperty(receiver, key, {
                        // @ts-ignore: TS doesn't like __proto__ on property descriptors.
                        __proto__: null,
                        value,
                    });
                }
                return true;
            }
            // `ReflectDefineProperty` and `ReflectSet` both are expected to
            // return `false` when attempting to add a new property if the
            // receiver is not extensible.
            return ReflectDefineProperty(receiver, key, {
                // @ts-ignore: TS doesn't like __proto__ on property descriptors.
                __proto__: null,
                configurable: true,
                enumerable: true,
                value,
                writable: true,
            });
        }

        function liveSetPrototypeOf(
            foreignTargetPointer: Pointer,
            proto: object | null
        ): ReturnType<typeof Reflect.setPrototypeOf> {
            const transferableProto = getTransferableValue(proto) as Pointer | null;
            return foreignCallableSetPrototypeOf(foreignTargetPointer, transferableProto);
        }

        function lockShadowTarget(shadowTarget: ShadowTarget, foreignTargetPointer: Pointer) {
            copyForeignDescriptorsIntoShadowTarget(shadowTarget, foreignTargetPointer);
            // setting up __proto__ of the shadowTarget
            const proto = liveGetPrototypeOf(foreignTargetPointer);
            ReflectSetPrototypeOf(shadowTarget, proto);
            // locking down the extensibility of shadowTarget
            ReflectPreventExtensions(shadowTarget);
        }

        function pushErrorAcrossBoundary(e: any): any {
            const transferableError = getTransferableValue(e);
            if (typeof transferableError === 'function') {
                transferableError();
            }
            return e;
        }

        function toSafeDescriptor<T extends PropertyDescriptor>(desc: T): T {
            ReflectSetPrototypeOf(desc, null);
            return desc;
        }

        class BoundaryProxyHandler implements ProxyHandler<ShadowTarget> {
            // public fields
            defineProperty: ProxyHandler<ShadowTarget>['defineProperty'];

            deleteProperty: ProxyHandler<ShadowTarget>['deleteProperty'];

            get: ProxyHandler<ShadowTarget>['get'];

            getOwnPropertyDescriptor: ProxyHandler<ShadowTarget>['getOwnPropertyDescriptor'];

            getPrototypeOf: ProxyHandler<ShadowTarget>['getPrototypeOf'];

            has: ProxyHandler<ShadowTarget>['has'];

            isExtensible: ProxyHandler<ShadowTarget>['isExtensible'];

            ownKeys: ProxyHandler<ShadowTarget>['ownKeys'];

            preventExtensions: ProxyHandler<ShadowTarget>['preventExtensions'];

            proxy: ShadowTarget;

            revoke: () => void;

            set: ProxyHandler<ShadowTarget>['set'];

            setPrototypeOf: ProxyHandler<ShadowTarget>['setPrototypeOf'];

            // the purpose of this public field is to help developers to identify
            // what side of the membrane they are debugging.
            readonly color = color;

            // callback to prepare the foreign realm before any operation
            private readonly foreignTargetPointer: Pointer;

            constructor(
                foreignTargetPointer: Pointer,
                foreignTargetTraits: TargetTraits,
                foreignTargetFunctionName: string | undefined
            ) {
                const shadowTarget = createShadowTarget(
                    foreignTargetTraits,
                    foreignTargetFunctionName
                );
                const { proxy, revoke } = ProxyRevocable(shadowTarget, this);
                this.foreignTargetPointer = foreignTargetPointer;
                this.proxy = proxy;
                this.revoke = revoke;
                // inserting default traps
                this.defineProperty = BoundaryProxyHandler.defaultDefinePropertyTrap;
                this.deleteProperty = BoundaryProxyHandler.defaultDeletePropertyTrap;
                this.isExtensible = BoundaryProxyHandler.defaultIsExtensibleTrap;
                this.getOwnPropertyDescriptor =
                    BoundaryProxyHandler.defaultGetOwnPropertyDescriptorTrap;
                this.getPrototypeOf = BoundaryProxyHandler.defaultGetPrototypeOfTrap;
                this.get = BoundaryProxyHandler.defaultGetTrap;
                this.has = BoundaryProxyHandler.defaultHasTrap;
                this.ownKeys = BoundaryProxyHandler.defaultOwnKeysTrap;
                this.preventExtensions = BoundaryProxyHandler.defaultPreventExtensionsTrap;
                this.setPrototypeOf = BoundaryProxyHandler.defaultSetPrototypeOfTrap;
                this.set = BoundaryProxyHandler.defaultSetTrap;
                if (foreignTargetTraits & TargetTraits.Revoked) {
                    revoke();
                }
                if (!trapMutations) {
                    // if local mutations are not trapped, then freezing the handler is ok
                    // because it is not expecting to change in the future.
                    // future optimization: hoping that proxies with frozen handlers can be faster
                    ObjectFreeze(this);
                }
            }

            // apply trap is generic, and should never change independently of the type of membrane
            readonly apply = function applyTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                thisArg: any,
                args: any[]
            ): any {
                const { foreignTargetPointer } = this;
                const transferableThisArg = getTransferableValue(thisArg);
                const combinedArgs = [foreignTargetPointer, transferableThisArg];
                const { length: argsLen } = args;
                const { length: combinedOffset } = combinedArgs;
                combinedArgs.length += argsLen;
                for (let i = 0, len = argsLen; i < len; i += 1) {
                    const arg = args[i];
                    const combinedIndex = i + combinedOffset;
                    // Inlining `getTransferableValue`.
                    if (typeof arg === 'undefined') {
                        combinedArgs[combinedIndex] = undefined;
                    } else if (
                        arg === null ||
                        (typeof arg !== 'function' && typeof arg !== 'object')
                    ) {
                        combinedArgs[combinedIndex] = arg;
                    } else {
                        combinedArgs[combinedIndex] = getTransferablePointer(arg);
                    }
                }
                return getLocalValue(ReflectApply(foreignCallableApply, undefined, combinedArgs));
            };

            // construct trap is generic, and should never change independently
            // of the type of membrane
            readonly construct = function constructTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                args: any[],
                newTarget: any
            ): any {
                if (newTarget === undefined) {
                    throw new TypeErrorCtor();
                }
                const { foreignTargetPointer } = this;
                const transferableNewTarget = getTransferableValue(newTarget);
                const combinedArgs = [foreignTargetPointer, transferableNewTarget];
                const { length: argsLen } = args;
                const { length: combinedOffset } = combinedArgs;
                combinedArgs.length += argsLen;
                for (let i = 0, len = argsLen; i < len; i += 1) {
                    const arg = args[i];
                    const combinedIndex = i + combinedOffset;
                    // Inline `getTransferableValue`.
                    if (typeof arg === 'undefined') {
                        combinedArgs[combinedIndex] = undefined;
                    } else if (
                        arg === null ||
                        (typeof arg !== 'function' && typeof arg !== 'object')
                    ) {
                        combinedArgs[combinedIndex] = arg;
                    } else {
                        combinedArgs[combinedIndex] = getTransferablePointer(arg);
                    }
                }
                return getLocalValue(
                    ReflectApply(foreignCallableConstruct, undefined, combinedArgs)
                );
            };

            // internal utilities
            private makeProxyLive() {
                // assert: trapMutations must be true
                // replacing pending traps with live traps that can work with
                // the target without taking snapshots.
                this.defineProperty = BoundaryProxyHandler.liveDefinePropertyTrap;
                this.deleteProperty = BoundaryProxyHandler.liveDeletePropertyTrap;
                this.preventExtensions = BoundaryProxyHandler.livePreventExtensionsTrap;
                this.set = BoundaryProxyHandler.liveSetTrap;
                this.setPrototypeOf = BoundaryProxyHandler.liveSetPrototypeOfTrap;
                // future optimization: hoping that proxies with frozen handlers can be faster
                ObjectFreeze(this);
            }

            private makeProxyStatic(shadowTarget: ShadowTarget) {
                // assert: trapMutations must be true
                const { foreignTargetPointer } = this;
                const targetIntegrityTraits =
                    foreignCallableGetTargetIntegrityTraits(foreignTargetPointer);
                if (targetIntegrityTraits & TargetIntegrityTraits.Revoked) {
                    // the target is a revoked proxy, in which case we revoke
                    // this proxy as well.
                    this.revoke();
                    return;
                }
                // adjusting the proto chain of the shadowTarget
                try {
                    // a proxy that revoke itself when the __proto__ is accessed
                    // can break the membrane, therefore we need protection
                    const proto = liveGetPrototypeOf(foreignTargetPointer);
                    ReflectSetPrototypeOf(shadowTarget, proto);
                } catch {
                    // TODO: is revoke the right action here? maybe just setting
                    // proto to null instead?
                    this.revoke();
                    return;
                }
                // defining own descriptors
                copyForeignDescriptorsIntoShadowTarget(shadowTarget, foreignTargetPointer);
                // preserving the semantics of the object
                if (targetIntegrityTraits & TargetIntegrityTraits.IsFrozen) {
                    ObjectFreeze(shadowTarget);
                } else if (targetIntegrityTraits & TargetIntegrityTraits.IsSealed) {
                    ObjectSeal(shadowTarget);
                } else if (targetIntegrityTraits & TargetIntegrityTraits.IsNotExtensible) {
                    ReflectPreventExtensions(shadowTarget);
                }
                // resetting all traps except apply and construct for static
                // proxies since the proxy target is the shadow target and all
                // operations are going to be applied to it rather than the real
                // target.
                this.defineProperty = BoundaryProxyHandler.staticDefinePropertyTrap;
                this.deleteProperty = BoundaryProxyHandler.staticDeletePropertyTrap;
                this.get = BoundaryProxyHandler.staticGetTrap;
                this.getOwnPropertyDescriptor =
                    BoundaryProxyHandler.staticGetOwnPropertyDescriptorTrap;
                this.getPrototypeOf = BoundaryProxyHandler.staticGetPrototypeOfTrap;
                this.has = BoundaryProxyHandler.staticHasTrap;
                this.isExtensible = BoundaryProxyHandler.staticIsExtensibleTrap;
                this.ownKeys = BoundaryProxyHandler.staticOwnKeysTrap;
                this.preventExtensions = BoundaryProxyHandler.staticPreventExtensionsTrap;
                this.set = BoundaryProxyHandler.staticSetTrap;
                this.setPrototypeOf = BoundaryProxyHandler.staticSetPrototypeOfTrap;
                // future optimization: hoping that proxies with frozen handlers can be faster
                ObjectFreeze(this);
            }

            private makeProxyUnambiguous(shadowTarget: ShadowTarget) {
                // assert: trapMutations must be true
                if (isForeignTargetMarkedLive(this.foreignTargetPointer)) {
                    this.makeProxyLive();
                } else {
                    this.makeProxyStatic(shadowTarget);
                }
            }

            // logic implementation of all traps

            // live traps:

            /**
             * Traps with proto chain traversal capabilities are the exception of
             * the rules here, the problem is that the other side might or might
             * not have:
             * a) local mutations only
             * b) distortions
             *
             * Therefore, the logic has to be bound to the caller, the one
             * initiating the across membrane access.
             */

            private static liveDefinePropertyTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                key: string | symbol,
                unsafePartialDesc: PropertyDescriptor
            ): ReturnType<typeof Reflect.defineProperty> {
                return liveDefineProperty(
                    this.foreignTargetPointer,
                    shadowTarget,
                    key,
                    unsafePartialDesc
                );
            }

            private static liveDeletePropertyTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                key: string | symbol
            ): ReturnType<typeof Reflect.deleteProperty> {
                return liveDeleteProperty(this.foreignTargetPointer, shadowTarget, key);
            }

            private static liveGetOwnPropertyDescriptorTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                key: string | symbol
            ): ReturnType<typeof Reflect.getOwnPropertyDescriptor> {
                return liveGetOwnPropertyDescriptor(this.foreignTargetPointer, shadowTarget, key);
            }

            private static liveGetPrototypeOfTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget
            ): ReturnType<typeof Reflect.getPrototypeOf> {
                return liveGetPrototypeOf(this.foreignTargetPointer);
            }

            /**
             * This trap cannot just use `ReflectGet` directly on the `target`
             * because the red object graph might have mutations that are only
             * visible on the red side, which means looking into `target` directly
             * is not viable. Instead, we need to implement a more crafty solution
             * that looks into target's own properties, or in the red proto chain
             * when needed.
             *
             * In a transparent membrane, this method will have been a lot simpler, like:
             *
             *   const { foreignTargetPointer } = this;
             *   const receiverPointer = getValueOrPointer(receiver);
             *   const foreignValueOrCallable =
             *      foreignCallableGet(foreignTargetPointer, key, receiverPointer);
             *   return getLocalValue(foreignValueOrCallable);
             *
             */
            private static liveGetTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                key: string | symbol,
                receiver: any
            ): ReturnType<typeof Reflect.get> {
                // assert: trapMutations must be true
                return liveGet(this.foreignTargetPointer, shadowTarget, key, receiver);
            }

            /**
             * This trap cannot just use `Reflect.has` or the `in` operator
             * directly because the red object graph might have mutations that
             * are only visible on the red side, which means looking into `target`
             * directly is not viable. Instead, we need to implement a more crafty
             * solution that looks into target's own properties, or in the red
             * proto chain when needed.
             *
             * In a transparent membrane, this method will have been a lot
             * simpler, like:
             *
             *      const { foreignTargetPointer } = this;
             *      return foreignCallableHas(foreignTargetPointer, key);
             *
             */
            private static liveHasTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                key: string | symbol
            ): ReturnType<typeof Reflect.has> {
                // assert: trapMutations must be true
                return liveHas(this.foreignTargetPointer, key);
            }

            private static liveIsExtensibleTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget
            ): ReturnType<typeof Reflect.isExtensible> {
                return liveIsExtensible(this.foreignTargetPointer, shadowTarget);
            }

            private static liveOwnKeysTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget
            ): ReturnType<typeof Reflect.ownKeys> {
                return liveOwnKeys(this.foreignTargetPointer);
            }

            private static livePreventExtensionsTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget
            ): ReturnType<typeof Reflect.preventExtensions> {
                return livePreventExtensions(this.foreignTargetPointer, shadowTarget);
            }

            private static liveSetPrototypeOfTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                proto: object | null
            ): ReturnType<typeof Reflect.setPrototypeOf> {
                return liveSetPrototypeOf(this.foreignTargetPointer, proto);
            }

            /**
             * This trap cannot just use `ReflectSet` directly on the `target` because
             * the red object graph might have mutations that are only visible on the red side,
             * which means looking into `target` directly is not viable. Instead, we need to
             * implement a more crafty solution that looks into target's own properties, or
             * in the red proto chain when needed.
             *
             *  const { foreignTargetPointer } = this;
             *  const valuePointer = getValueOrPointer(value);
             *  const receiverPointer = getValueOrPointer(receiver);
             *  return foreignCallableSet(foreignTargetPointer, key, valuePointer, receiverPointer);
             *
             */
            private static liveSetTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                key: string | symbol,
                value: any,
                receiver: any
            ): boolean {
                // assert: trapMutations must be true
                const useFastPath = this.proxy === receiver;
                return liveSet(
                    this.foreignTargetPointer,
                    shadowTarget,
                    key,
                    value,
                    receiver,
                    useFastPath
                );
            }

            // pending traps
            private static pendingDefinePropertyTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                key: string | symbol,
                unsafePartialDesc: PropertyDescriptor
            ): ReturnType<typeof Reflect.defineProperty> {
                // assert: trapMutations must be true
                this.makeProxyUnambiguous(shadowTarget);
                return this.defineProperty!(shadowTarget, key, unsafePartialDesc);
            }

            private static pendingDeletePropertyTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                key: string | symbol
            ): ReturnType<typeof Reflect.deleteProperty> {
                // assert: trapMutations must be true
                this.makeProxyUnambiguous(shadowTarget);
                return this.deleteProperty!(shadowTarget, key);
            }

            private static pendingPreventExtensionsTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget
            ): ReturnType<typeof Reflect.preventExtensions> {
                // assert: trapMutations must be true
                this.makeProxyUnambiguous(shadowTarget);
                return this.preventExtensions!(shadowTarget);
            }

            private static pendingSetPrototypeOfTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                proto: object | null
            ): ReturnType<typeof Reflect.setPrototypeOf> {
                // assert: trapMutations must be true
                this.makeProxyUnambiguous(shadowTarget);
                return this.setPrototypeOf!(shadowTarget, proto);
            }

            private static pendingSetTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                key: string | symbol,
                value: any,
                receiver: any
            ): ReturnType<typeof Reflect.set> {
                // assert: trapMutations must be true
                this.makeProxyUnambiguous(shadowTarget);
                return this.set!(shadowTarget, key, value, receiver);
            }

            private static staticDefinePropertyTrap = ReflectDefineProperty;

            private static staticDeletePropertyTrap = ReflectDeleteProperty;

            /**
             * This trap is just `ReflectGet` plus handling of object branding
             * for proxies.
             *
             */
            private static staticGetTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                key: string | symbol,
                receiver: any
            ): ReturnType<typeof Reflect.get> {
                if (key === TO_STRING_TAG_SYMBOL) {
                    return foreignCallableGetUnbrandedTag(this.foreignTargetPointer);
                }
                return ReflectGet(shadowTarget, key, receiver);
            }

            private static staticGetOwnPropertyDescriptorTrap = ReflectGetOwnPropertyDescriptor;

            private static staticGetPrototypeOfTrap = ReflectGetPrototypeOf;

            private static staticHasTrap = ReflectHas;

            private static staticIsExtensibleTrap = ReflectIsExtensible;

            private static staticOwnKeysTrap = ReflectOwnKeys;

            private static staticPreventExtensionsTrap = ReflectPreventExtensions;

            private static staticSetTrap = ReflectSet;

            private static staticSetPrototypeOfTrap = ReflectSetPrototypeOf;

            // static default traps
            // (optimization to avoid computations of the proper trap in constructor)
            private static defaultGetTrap = BoundaryProxyHandler.liveGetTrap;

            private static defaultGetOwnPropertyDescriptorTrap =
                BoundaryProxyHandler.liveGetOwnPropertyDescriptorTrap;

            private static defaultGetPrototypeOfTrap = BoundaryProxyHandler.liveGetPrototypeOfTrap;

            private static defaultHasTrap = BoundaryProxyHandler.liveHasTrap;

            private static defaultIsExtensibleTrap = BoundaryProxyHandler.liveIsExtensibleTrap;

            private static defaultOwnKeysTrap = BoundaryProxyHandler.liveOwnKeysTrap;

            // pending traps are only really needed if this membrane traps
            // mutations to avoid mutations operations on the side of the membrane.
            // TODO: find a way to optimize the declaration rather than instantiation
            private static defaultDefinePropertyTrap = trapMutations
                ? BoundaryProxyHandler.pendingDefinePropertyTrap
                : BoundaryProxyHandler.liveDefinePropertyTrap;

            private static defaultDeletePropertyTrap = trapMutations
                ? BoundaryProxyHandler.pendingDeletePropertyTrap
                : BoundaryProxyHandler.liveDeletePropertyTrap;

            private static defaultPreventExtensionsTrap = trapMutations
                ? BoundaryProxyHandler.pendingPreventExtensionsTrap
                : BoundaryProxyHandler.livePreventExtensionsTrap;

            private static defaultSetTrap = trapMutations
                ? BoundaryProxyHandler.pendingSetTrap
                : BoundaryProxyHandler.liveSetTrap;

            private static defaultSetPrototypeOfTrap = trapMutations
                ? BoundaryProxyHandler.pendingSetPrototypeOfTrap
                : BoundaryProxyHandler.liveSetPrototypeOfTrap;
        }
        ReflectSetPrototypeOf(BoundaryProxyHandler.prototype, null);

        // future optimization: hoping proxies with frozen handlers can be faster
        ObjectFreeze(BoundaryProxyHandler.prototype);

        // exporting callable hooks for a foreign realm
        foreignCallableHooksCallback(
            // globalThisPointer
            // When crossing, should be mapped to the foreign globalThis
            createPointer(globalThis),
            // getSelectedTarget
            getSelectedTarget,
            // getTransferableValue
            getTransferableValue,
            // callableGetPropertyValuePointer: this callable function allows
            // the foreign realm to access a linkable pointer for a property value.
            // In order to do that, the foreign side must provide a pointer and
            // a key access the value in order to produce a pointer
            (targetPointer: Pointer, key: string | symbol) => {
                targetPointer();
                const target = getSelectedTarget();
                const value: ProxyTarget = target[key];
                // TODO: what if the value is not a valid proxy target?
                return createPointer(value);
            },
            // callableEvaluate
            (sourceText: string): PointerOrPrimitive => {
                try {
                    return getTransferableValue(cachedLocalEval(sourceText));
                } catch (e: any) {
                    throw pushErrorAcrossBoundary(e);
                }
            },
            // callableLinkPointers: this callable function allows the foreign
            // realm to define a linkage between two values across the membrane.
            (targetPointer: Pointer, newPointer: Pointer) => {
                targetPointer();
                const target = getSelectedTarget();
                ReflectApply(WeakMapProtoSet, proxyTargetToPointerMap, [target, newPointer]);
            },
            /**
             * callablePushTarget: This function can be used by a foreign realm to install a proxy
             * into this realm that correspond to an object from the foreign realm. It returns
             * a Pointer that can be used by the foreign realm to pass back a reference to this
             * realm when passing arguments or returning from a foreign callable invocation. This
             * function is extremely important to understand the mechanics of this membrane.
             */
            (
                foreignTargetPointer: () => void,
                foreignTargetTraits: TargetTraits,
                foreignTargetFunctionName: string | undefined
            ): Pointer => {
                const { proxy } = new BoundaryProxyHandler(
                    foreignTargetPointer,
                    foreignTargetTraits,
                    foreignTargetFunctionName
                );
                ReflectApply(WeakMapProtoSet, proxyTargetToPointerMap, [
                    proxy,
                    foreignTargetPointer,
                ]);
                return createPointer(proxy);
            },
            // callableApply
            instrumentCallableWrapper(
                (
                    targetPointer: Pointer,
                    thisArgPointerOrValue: PointerOrPrimitive,
                    ...listOfValuesOrPointers: PointerOrPrimitive[]
                ): PointerOrPrimitive => {
                    targetPointer();
                    const fn = getSelectedTarget();
                    const thisArg = getLocalValue(thisArgPointerOrValue);
                    const { length: argsLen } = listOfValuesOrPointers;
                    const args = new ArrayCtor(argsLen);
                    for (let i = 0, len = argsLen; i < len; i += 1) {
                        args[i] = getLocalValue(listOfValuesOrPointers[i]);
                    }
                    let value;
                    try {
                        value = ReflectApply(fn, thisArg, args);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                    return getTransferableValue(value);
                },
                'callableApply',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableConstruct
            instrumentCallableWrapper(
                (
                    targetPointer: Pointer,
                    newTargetPointerOrValue: PointerOrPrimitive,
                    ...listOfValuesOrPointers: PointerOrPrimitive[]
                ): PointerOrPrimitive => {
                    targetPointer();
                    const constructor = getSelectedTarget();
                    const newTarget = getLocalValue(newTargetPointerOrValue);
                    const { length: argsLen } = listOfValuesOrPointers;
                    const args = new ArrayCtor(argsLen);
                    for (let i = 0, len = argsLen; i < len; i += 1) {
                        args[i] = getLocalValue(listOfValuesOrPointers[i]);
                    }
                    let value;
                    try {
                        value = ReflectConstruct(constructor, args, newTarget);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                    return getTransferableValue(value);
                },
                'callableConstruct',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableDefineProperty
            instrumentCallableWrapper(
                (
                    targetPointer: Pointer,
                    key: string | symbol,
                    configurable: boolean | symbol,
                    enumerable: boolean | symbol,
                    writable: boolean | symbol,
                    valuePointer: PointerOrPrimitive,
                    getPointer: PointerOrPrimitive,
                    setPointer: PointerOrPrimitive
                ): boolean => {
                    targetPointer();
                    const target = getSelectedTarget();
                    try {
                        return ReflectDefineProperty(
                            target,
                            key,
                            createDescriptorFromMeta(
                                configurable,
                                enumerable,
                                writable,
                                valuePointer,
                                getPointer,
                                setPointer
                            )
                        );
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                },
                'callableDefineProperty',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableDeleteProperty
            instrumentCallableWrapper(
                (targetPointer: Pointer, key: string | symbol): boolean => {
                    targetPointer();
                    const target = getSelectedTarget();
                    try {
                        return ReflectDeleteProperty(target, key);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                },
                'callableDeleteProperty',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableGetOwnPropertyDescriptor
            instrumentCallableWrapper(
                (
                    targetPointer: Pointer,
                    key: string | symbol,
                    foreignCallableDescriptorCallback: CallableDescriptorCallback
                ): void => {
                    targetPointer();
                    const target = getSelectedTarget();
                    let unsafeDesc;
                    try {
                        unsafeDesc = ReflectGetOwnPropertyDescriptor(target, key);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                    if (unsafeDesc) {
                        const descMeta = getDescriptorMeta(unsafeDesc);
                        foreignCallableDescriptorCallback(
                            descMeta[0], // configurable
                            descMeta[1], // enumerable
                            descMeta[2], // writable
                            descMeta[3], // valuePointer
                            descMeta[4], // getPointer
                            descMeta[5] // setPointer
                        );
                    }
                },
                'callableGetOwnPropertyDescriptor',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableGetPrototypeOf
            instrumentCallableWrapper(
                (targetPointer: Pointer): PointerOrPrimitive => {
                    targetPointer();
                    const target = getSelectedTarget();
                    let proto;
                    try {
                        proto = ReflectGetPrototypeOf(target);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                    return getTransferableValue(proto);
                },
                'callableGetPrototypeOf',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableIsExtensible
            instrumentCallableWrapper(
                (targetPointer: Pointer): boolean => {
                    targetPointer();
                    const target = getSelectedTarget();
                    try {
                        return ReflectIsExtensible(target);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                },
                'callableIsExtensible',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableOwnKeys
            instrumentCallableWrapper(
                (
                    targetPointer: Pointer,
                    foreignCallableKeysCallback: (
                        ...args: ReturnType<typeof Reflect.ownKeys>
                    ) => void
                ): void => {
                    targetPointer();
                    const target = getSelectedTarget();
                    let keys;
                    try {
                        keys = ReflectOwnKeys(target) as (string | symbol)[];
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                    ReflectApply(foreignCallableKeysCallback, undefined, keys);
                },
                'callableOwnKeys',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callablePreventExtensions
            instrumentCallableWrapper(
                (targetPointer: Pointer): boolean => {
                    targetPointer();
                    const target = getSelectedTarget();
                    try {
                        return ReflectPreventExtensions(target);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                },
                'callablePreventExtensions',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableSet
            instrumentCallableWrapper(
                (
                    targetPointer: Pointer,
                    propertyKey: PropertyKey,
                    valuePointer: Pointer,
                    receiverPointer?: Pointer
                ): boolean => {
                    targetPointer();
                    const target = getSelectedTarget();
                    try {
                        return ReflectSet(
                            target,
                            propertyKey,
                            getLocalValue(valuePointer),
                            getLocalValue(receiverPointer)
                        );
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                },
                'callableSet',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableSetPrototypeOf
            instrumentCallableWrapper(
                (targetPointer: Pointer, protoPointerOrNull: Pointer | null): boolean => {
                    targetPointer();
                    const target = getSelectedTarget();
                    const proto = getLocalValue(protoPointerOrNull);
                    try {
                        return ReflectSetPrototypeOf(target, proto);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                },
                'callableSetPrototypeOf',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableGetTargetIntegrityTraits
            instrumentCallableWrapper(
                (targetPointer: Pointer): TargetIntegrityTraits => {
                    targetPointer();
                    const target = getSelectedTarget();
                    return getTargetIntegrityTraits(target);
                },
                'callableGetTargetIntegrityTraits',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableGetUnbrandedTag
            instrumentCallableWrapper(
                (targetPointer: Pointer): string | undefined => {
                    targetPointer();
                    const target = getSelectedTarget();
                    try {
                        if (
                            typeof target === 'object' &&
                            target !== null &&
                            !isArrayOrNotOrThrowForRevoked(target)
                        ) {
                            // Section 19.1.3.6: Object.prototype.toString()
                            // Step 16: If `Type(tag)` is not `String`, let `tag` be `builtinTag`.
                            // https://tc39.github.io/ecma262/#sec-object.prototype.tostring
                            const toStringValue = ReflectApply(ObjectProtoToString, target, []);
                            return ReflectApply(StringProtoSlice, toStringValue, [8, -1]);
                        }
                        // eslint-disable-next-line no-empty
                    } catch {}
                    return undefined;
                },
                'callableGetUnbrandedTag',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableHasOwnProperty
            instrumentCallableWrapper(
                (targetPointer: Pointer, key: string | symbol): boolean => {
                    targetPointer();
                    const target = getSelectedTarget();
                    try {
                        return ReflectApply(ObjectProtoHasOwnProperty, target, [key]);
                    } catch (e: any) {
                        throw pushErrorAcrossBoundary(e);
                    }
                },
                'callableHasOwnProperty',
                INBOUND_INSTRUMENTATION_LABEL
            )
        );
        return (...hooks: Parameters<HooksCallback>) => {
            const {
                // 0: globalThisPointer,
                // 1: getSelectedTarget,
                // 2: getTransferableValue,
                // 3: callableGetPropertyValuePointer,
                // 4: callableEvaluate,
                // 5: callableLinkPointers,
                6: callablePushTarget,
                7: callableApply,
                8: callableConstruct,
                9: callableDefineProperty,
                10: callableDeleteProperty,
                11: callableGetOwnPropertyDescriptor,
                12: callableGetPrototypeOf,
                13: callableIsExtensible,
                14: callableOwnKeys,
                15: callablePreventExtensions,
                16: callableSet,
                17: callableSetPrototypeOf,
                18: callableGetTargetIntegrityTraits,
                19: callableGetUnbrandedTag,
                20: callableHasOwnProperty,
            } = hooks;
            foreignCallablePushTarget = callablePushTarget;
            // traps utilities
            foreignCallableApply = foreignErrorControl(
                instrumentCallableWrapper(
                    callableApply,
                    'callableApply',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableConstruct = foreignErrorControl(
                instrumentCallableWrapper(
                    callableConstruct,
                    'callableConstruct',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableDefineProperty = foreignErrorControl(
                instrumentCallableWrapper(
                    callableDefineProperty,
                    'callableDefineProperty',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableDeleteProperty = foreignErrorControl(
                instrumentCallableWrapper(
                    callableDeleteProperty,
                    'callableDeleteProperty',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableGetOwnPropertyDescriptor = foreignErrorControl(
                instrumentCallableWrapper(
                    callableGetOwnPropertyDescriptor,
                    'callableGetOwnPropertyDescriptor',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableGetPrototypeOf = foreignErrorControl(
                instrumentCallableWrapper(
                    callableGetPrototypeOf,
                    'callableGetPrototypeOf',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableIsExtensible = foreignErrorControl(
                instrumentCallableWrapper(
                    callableIsExtensible,
                    'callableIsExtensible',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableOwnKeys = foreignErrorControl(
                instrumentCallableWrapper(
                    callableOwnKeys,
                    'callableOwnKeys',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallablePreventExtensions = foreignErrorControl(
                instrumentCallableWrapper(
                    callablePreventExtensions,
                    'callablePreventExtensions',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableSet = foreignErrorControl(
                instrumentCallableWrapper(
                    callableSet,
                    'callableSet',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableSetPrototypeOf = foreignErrorControl(
                instrumentCallableWrapper(
                    callableSetPrototypeOf,
                    'callableSetPrototypeOf',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableGetTargetIntegrityTraits = foreignErrorControl(
                instrumentCallableWrapper(
                    callableGetTargetIntegrityTraits,
                    'callableGetTargetIntegrityTraits',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableGetUnbrandedTag = foreignErrorControl(
                instrumentCallableWrapper(
                    callableGetUnbrandedTag,
                    'callableGetUnbrandedTag',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
            foreignCallableHasOwnProperty = foreignErrorControl(
                instrumentCallableWrapper(
                    callableHasOwnProperty,
                    'callableHasOwnProperty',
                    OUTBOUND_INSTRUMENTATION_LABEL
                )
            );
        };
    };
}
