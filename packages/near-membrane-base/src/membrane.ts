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

export type Pointer = CallableFunction;
type PrimitiveValue = number | symbol | string | boolean | bigint | null | undefined;
type PrimitiveOrPointer = Pointer | PrimitiveValue;
export type ProxyTarget = CallableFunction | any[] | object;
type ShadowTarget = CallableFunction | any[] | object;
type CallablePushTarget = (
    pointer: () => void,
    targetTraits: number,
    targetFunctionName: string | undefined
) => Pointer;
type CallableApply = (
    targetPointer: Pointer,
    thisArgValueOrPointer: PrimitiveOrPointer,
    ...listOfValuesOrPointers: PrimitiveOrPointer[]
) => PrimitiveOrPointer;
type CallableConstruct = (
    targetPointer: Pointer,
    newTargetPointer: PrimitiveOrPointer,
    ...listOfValuesOrPointers: PrimitiveOrPointer[]
) => PrimitiveOrPointer;
export type CallableDefineProperty = (
    targetPointer: Pointer,
    key: PropertyKey,
    configurable: boolean | symbol,
    enumerable: boolean | symbol,
    writable: boolean | symbol,
    valuePointer: PrimitiveOrPointer,
    getPointer: PrimitiveOrPointer,
    setPointer: PrimitiveOrPointer
) => boolean;
type CallableDeleteProperty = (targetPointer: Pointer, key: PropertyKey) => boolean;
type CallableDescriptorCallback = (
    configurable: boolean | symbol,
    enumerable: boolean | symbol,
    writable: boolean | symbol,
    valuePointer: PrimitiveOrPointer,
    getPointer: PrimitiveOrPointer,
    setPointer: PrimitiveOrPointer
) => void;
type CallableGetOwnPropertyDescriptor = (
    targetPointer: Pointer,
    key: PropertyKey,
    foreignCallableDescriptorCallback: CallableDescriptorCallback
) => void;
type CallableGetPrototypeOf = (targetPointer: Pointer) => PrimitiveOrPointer;
type CallableHas = (targetPointer: Pointer, key: PropertyKey) => boolean;
type CallableIsExtensible = (targetPointer: Pointer) => boolean;
type CallableOwnKeys = (
    targetPointer: Pointer,
    foreignCallableKeysCallback: (...args: (string | symbol)[]) => void
) => void;
type CallablePreventExtensions = (targetPointer: Pointer) => boolean;
export type CallableSetPrototypeOf = (
    targetPointer: Pointer,
    protoValueOrPointer: PrimitiveOrPointer
) => boolean;
type CallableGetTargetIntegrityTraits = (targetPointer: Pointer) => number;
type CallableHasOwnProperty = (targetPointer: Pointer, key: PropertyKey) => boolean;
export type CallableLinkPointers = (targetPointer: Pointer, foreignTargetPointer: Pointer) => void;
export type CallableInstallLazyDescriptors = (
    targetPointer: Pointer,
    ...keyAndEnumTuple: PropertyKey[]
) => void;
export type CallableGetPropertyValuePointer = (targetPointer: Pointer, key: PropertyKey) => Pointer;
export type CallableEvaluate = (sourceText: string) => void;
export type GetTransferableValue = (value: any) => PrimitiveOrPointer;
export type GetSelectedTarget = () => any;
export type HooksCallback = (
    globalThisPointer: Pointer,
    getSelectedTarget: GetSelectedTarget,
    getTransferableValue: GetTransferableValue,
    callableGetPropertyValuePointer: CallableGetPropertyValuePointer,
    callableEvaluate: CallableEvaluate,
    callableLinkPointers: CallableLinkPointers,
    callableInstallLazyDescriptor: CallableInstallLazyDescriptors,
    callablePushTarget: CallablePushTarget,
    callableApply: CallableApply,
    callableConstruct: CallableConstruct,
    callableDefineProperty: CallableDefineProperty,
    callableDeleteProperty: CallableDeleteProperty,
    callableGetOwnPropertyDescriptor: CallableGetOwnPropertyDescriptor,
    callableGetPrototypeOf: CallableGetPrototypeOf,
    callableHas: CallableHas,
    callableIsExtensible: CallableIsExtensible,
    callableOwnKeys: CallableOwnKeys,
    callablePreventExtensions: CallablePreventExtensions,
    callableSetPrototypeOf: CallableSetPrototypeOf,
    callableGetTargetIntegrityTraits: CallableGetTargetIntegrityTraits,
    callableHasOwnProperty: CallableHasOwnProperty
) => void;
// eslint-disable-next-line no-shadow
export enum SupportFlagsField {
    None = 0,
    MagicMarker = 1 << 0,
}

export type DistortionCallback = (target: ProxyTarget) => ProxyTarget;
export interface InitLocalOptions {
    distortionCallback?: DistortionCallback;
    instrumentation?: InstrumentationHooks;
}

// istanbul ignore next
export function createMembraneMarshall() {
    // eslint-disable-next-line no-shadow
    enum SourceFlags {
        None = 0,
        MagicMarker = 1 << 0,
    }

    // eslint-disable-next-line no-shadow
    enum TargetTraits {
        None = 0,
        IsArray = 1 << 0,
        IsFunction = 1 << 1,
        IsObject = 1 << 2,
        IsArrowFunction = 1 << 3,
        Revoked = 1 << 4,
    }

    // eslint-disable-next-line no-shadow
    enum TargetIntegrityTraits {
        None = 0,
        IsNotExtensible = 1 << 0,
        IsSealed = 1 << 1,
        IsFrozen = 1 << 2,
        Revoked = 1 << 4,
    }

    const { eval: cachedLocalEval } = globalThis;
    const ArrayCtor = Array;
    const { isArray: isArrayOrNotOrThrowForRevoked } = Array;
    const { push: ArrayProtoPush } = Array.prototype;
    const {
        defineProperties: ObjectDefineProperties,
        freeze: ObjectFreeze,
        isFrozen: ObjectIsFrozen,
        isSealed: ObjectIsSealed,
        seal: ObjectSeal,
    } = Object;
    const { hasOwnProperty: ObjectProtoHasOwnProperty } = Object.prototype;
    const { revocable: ProxyRevocable } = Proxy;
    const {
        defineProperty: ReflectDefineProperty,
        getOwnPropertyDescriptor: ReflectOwnPropertyDescriptor,
        setPrototypeOf: ReflectSetPrototypeOf,
        apply: ReflectApply,
        construct: ReflectConstruct,
        deleteProperty: ReflectDeleteProperty,
        get: ReflectGet,
        set: ReflectSet,
        has: ReflectHas,
        getPrototypeOf: ReflectGetPrototypeOf,
        isExtensible: ReflectIsExtensible,
        ownKeys: ReflectOwnKeys,
        preventExtensions: ReflectPreventExtensions,
    } = Reflect;
    const TypeErrorCtor = TypeError;
    const { get: WeakMapProtoGet, set: WeakMapProtoSet } = WeakMap.prototype;

    const LOCKER_LIVE_MARKER_SYMBOL = Symbol.for('@@lockerLiveValue');
    const LOCKER_MAGIC_MARKER_SYMBOL = Symbol.for('@@lockerMagicValue');
    const UNDEFINED_SYMBOL = Symbol.for('@@membraneUndefinedValue');

    return function createHooksCallback(
        color: string,
        trapMutations: boolean,
        supportFlags: SupportFlagsField = SupportFlagsField.None,
        foreignCallableHooksCallback: HooksCallback,
        options?: InitLocalOptions
    ): HooksCallback {
        const { distortionCallback = (o: ProxyTarget) => o, instrumentation } = options || {
            __proto__: null,
        };

        const proxyTargetToPointerMap = new WeakMap();

        const INBOUND_INSTRUMENTATION_LABEL = `to:${color}`;
        const OUTBOUND_INSTRUMENTATION_LABEL = `from:${color}`;

        const SUPPORT_MAGIC_MARKER = supportFlags & SourceFlags.MagicMarker;

        let selectedTarget: undefined | ProxyTarget;
        let foreignCallablePushTarget: CallablePushTarget;
        let foreignCallableApply: CallableApply;
        let foreignCallableConstruct: CallableConstruct;
        let foreignCallableDefineProperty: CallableDefineProperty;
        let foreignCallableDeleteProperty: CallableDeleteProperty;
        let foreignCallableGetOwnPropertyDescriptor: CallableGetOwnPropertyDescriptor;
        let foreignCallableGetPrototypeOf: CallableGetPrototypeOf;
        let foreignCallableHas: CallableHas;
        let foreignCallableIsExtensible: CallableIsExtensible;
        let foreignCallableOwnKeys: CallableOwnKeys;
        let foreignCallablePreventExtensions: CallablePreventExtensions;
        let foreignCallableSetPrototypeOf: CallableSetPrototypeOf;
        let foreignCallableGetTargetIntegrityTraits: CallableGetTargetIntegrityTraits;
        let foreignCallableHasOwnProperty: CallableHasOwnProperty;

        if (
            ReflectApply(ObjectProtoHasOwnProperty, Error, ['stackTraceLimit']) &&
            typeof Error.stackTraceLimit === 'number'
        ) {
            // The default stack trace limit is 10. Increasing to 20 as a baby step.
            Error.stackTraceLimit *= 2;
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
                    let result;
                    const activity = instrumentation.startActivity(activityName, {
                        crossingDirection
                    });
                    try {
                        result = ReflectApply(fn, this, args);
                    } catch (e: any) {
                        activity.error(e);
                        throw e;
                    } finally {
                        activity.stop();
                    }
                    return result;
                };
            }
            return fn;
        }

        function pushErrorAcrossBoundary(e: any): any {
            const ePointer = getTransferableValue(e);
            if (typeof ePointer === 'function') {
                ePointer();
            }
            return e;
        }

        function createPointer(originalTarget: ProxyTarget): () => void {
            // assert: originalTarget is a ProxyTarget
            const pointer = () => {
                // assert: selectedTarget is undefined
                selectedTarget = originalTarget;
            };
            // In case debugging is needed, the following line can help greatly:
            pointer['[[OriginalTarget]]'] = originalTarget;
            return pointer;
        }

        function getSelectedTarget(): any {
            // assert: selectedTarget is a ProxyTarget
            const r = selectedTarget;
            selectedTarget = undefined;
            return r;
        }

        function createShadowTarget(
            targetTraits: TargetTraits,
            targetFunctionName: string | undefined
        ): ShadowTarget {
            let shadowTarget;
            if (targetTraits & TargetTraits.IsFunction) {
                // this new shadow target function is never invoked just needed to anchor the realm
                // According the comment above, this function will never be called, therefore the
                // code should not be instrumented for code coverage.
                //
                // istanbul ignore next
                // eslint-disable-next-line func-names
                shadowTarget =
                    targetTraits & TargetTraits.IsArrowFunction ? () => {} : function () {};
                // This is only really needed for debugging, it helps to identify the proxy by name
                ReflectDefineProperty(shadowTarget, 'name', {
                    value: targetFunctionName,
                    configurable: true,
                });
            } else {
                // target is array or object
                shadowTarget = targetTraits & TargetTraits.IsArray ? [] : {};
            }
            return shadowTarget;
        }

        // metadata is the transferable descriptor definition
        function createDescriptorFromMeta(
            configurable: boolean | symbol,
            enumerable: boolean | symbol,
            writable: boolean | symbol,
            valuePointer: PrimitiveOrPointer,
            getPointer: PrimitiveOrPointer,
            setPointer: PrimitiveOrPointer
        ): PropertyDescriptor {
            // @ts-ignore for some reason, TS doesn't like __proto__ on property descriptors
            const desc: PropertyDescriptor = { __proto__: null };
            if (configurable !== UNDEFINED_SYMBOL) {
                desc.configurable = !!configurable;
            }
            if (enumerable !== UNDEFINED_SYMBOL) {
                desc.enumerable = !!enumerable;
            }
            if (writable !== UNDEFINED_SYMBOL) {
                desc.writable = !!writable;
            }
            if (getPointer !== UNDEFINED_SYMBOL) {
                desc.get = getLocalValue(getPointer);
            }
            if (setPointer !== UNDEFINED_SYMBOL) {
                desc.set = getLocalValue(setPointer);
            }
            if (valuePointer !== UNDEFINED_SYMBOL) {
                desc.value = getLocalValue(valuePointer);
            }
            return desc;
        }

        function copyForeignDescriptorIntoShadowTarget(
            shadowTarget: ShadowTarget,
            targetPointer: Pointer,
            key: PropertyKey
        ) {
            // Note: a property might get defined multiple times in the shadowTarget
            //       but it will always be compatible with the previous descriptor
            //       to preserve the object invariants, which makes these lines safe.
            let desc: PropertyDescriptor;
            const callbackWithDescriptor: CallableDescriptorCallback = (...descMeta) => {
                desc = ReflectApply(createDescriptorFromMeta, undefined, descMeta);
            };
            foreignCallableGetOwnPropertyDescriptor(targetPointer, key, callbackWithDescriptor);
            if (desc! !== undefined) {
                ReflectDefineProperty(shadowTarget, key, desc);
            }
        }

        function copyForeignDescriptorsIntoShadowTarget(
            shadowTarget: ShadowTarget,
            targetPointer: Pointer
        ) {
            let keys: PropertyKey[] = [];
            const callbackWithKeys = (...args: PropertyKey[]) => {
                keys = args;
            };
            foreignCallableOwnKeys(targetPointer, callbackWithKeys);
            // @ts-ignore for some reason, TS doesn't like __proto__ on property descriptors
            const descriptors: PropertyDescriptorMap = { __proto__: null };
            let desc: PropertyDescriptor;
            const callbackWithDescriptor: CallableDescriptorCallback = (...descMeta) => {
                desc = ReflectApply(createDescriptorFromMeta, undefined, descMeta);
            };
            for (let i = 0, len = keys.length; i < len; i += 1) {
                const key = keys[i] as string;
                foreignCallableGetOwnPropertyDescriptor(targetPointer, key, callbackWithDescriptor);
                descriptors[key] = desc!;
            }
            // Use `ObjectDefineProperties()` instead of individual
            // `ReflectDefineProperty()` calls for better performance.
            ObjectDefineProperties(shadowTarget, descriptors);
        }

        function getDistortedValue(target: ProxyTarget): ProxyTarget {
            let distortedTarget: ProxyTarget | undefined;
            try {
                distortedTarget = distortionCallback(target);
            } finally {
                // if a distortion entry is found, it must be a valid proxy target
                if (distortedTarget !== target && typeof distortedTarget !== typeof target) {
                    // eslint-disable-next-line no-unsafe-finally
                    throw new TypeErrorCtor(`Invalid distortion ${target}.`);
                }
            }
            return distortedTarget;
        }

        function isMarked(targetPointer: Pointer, marker: symbol): boolean {
            try {
                return foreignCallableHas(targetPointer, marker);
            } catch {
                // try-catching this because blue could be a proxy that is revoked
                // or throws from the `has` trap.
            }
            return false;
        }

        function isPointer(
            primitiveValueOrForeignCallable: PrimitiveOrPointer
        ): primitiveValueOrForeignCallable is CallableFunction {
            return typeof primitiveValueOrForeignCallable === 'function';
        }

        // TODO: this needs optimization
        function isPrimitiveValue(
            primitiveValueOrForeignCallable: PrimitiveOrPointer
        ): primitiveValueOrForeignCallable is PrimitiveValue {
            // TODO: what other ways to optimize this method?
            return (
                primitiveValueOrForeignCallable === null ||
                (typeof primitiveValueOrForeignCallable !== 'function' &&
                    typeof primitiveValueOrForeignCallable !== 'object')
            );
        }

        function getTransferablePointer(originalTarget: ProxyTarget): Pointer {
            let pointer = ReflectApply(WeakMapProtoGet, proxyTargetToPointerMap, [originalTarget]);
            if (pointer) {
                return pointer;
            }
            // extracting the metadata about the proxy target
            let targetTraits = TargetTraits.None;
            let targetFunctionName: string | undefined;
            const distortedTarget = getDistortedValue(originalTarget);
            if (typeof distortedTarget === 'function') {
                targetTraits |= TargetTraits.IsFunction;
                // detecting arrow function vs function
                try {
                    targetTraits |=
                        +!('prototype' in distortedTarget) && TargetTraits.IsArrowFunction;
                } catch {
                    // target is either a revoked proxy, or a proxy that throws on the
                    // `has` trap, in which case going with a strict mode function seems
                    // appropriate.
                }
                try {
                    // a revoked proxy will throw when reading the function name
                    targetFunctionName = ReflectOwnPropertyDescriptor(distortedTarget, 'name')
                        ?.value;
                } catch {
                    // intentionally swallowing the error because this method is just extracting
                    // the function in a way that it should always succeed except for the cases
                    // in which the provider is a proxy that is either revoked or has some logic
                    // to prevent reading the name property descriptor.
                }
            } else {
                let targetIsArray = false;
                try {
                    // try/catch in case Array.isArray throws when target is a revoked proxy
                    targetIsArray = isArrayOrNotOrThrowForRevoked(distortedTarget);
                } catch {
                    // TODO: this might be problematic, because functions and arrow functions should
                    // also be subject to this, but it seems that we can still create a proxy of a
                    // revoke, and wait until the user-land code actually access something out of it
                    // to throw the proper error.
                    // target is a revoked proxy, so the type doesn't matter much from this point on
                    targetTraits |= TargetTraits.Revoked;
                }
                targetTraits |= +targetIsArray && TargetTraits.IsArray;
                targetTraits |= +!targetIsArray && TargetTraits.IsObject;
            }
            // the closure works as the implicit WeakMap
            const pointerForTarget = createPointer(distortedTarget);
            pointer = foreignCallablePushTarget(pointerForTarget, targetTraits, targetFunctionName);

            // the WeakMap is populated with the original target rather then the distorted one
            // while the pointer always uses the distorted one.
            // TODO: this mechanism poses another issue, which is that the return value of
            // getSelectedTarget() can never be used to call across the membrane because that
            // will cause a wrapping around the potential distorted value instead of the original
            // value. This is not fatal, but implies that for every distorted value where will
            // two proxies that are not ===, which is weird. Guaranteeing this is not easy because
            // it means auditing the code.
            ReflectApply(WeakMapProtoSet, proxyTargetToPointerMap, [originalTarget, pointer]);
            return pointer;
        }

        function getLocalValue(primitiveValueOrForeignPointer: PrimitiveOrPointer): any {
            if (isPointer(primitiveValueOrForeignPointer)) {
                primitiveValueOrForeignPointer();
                return getSelectedTarget();
            }
            return primitiveValueOrForeignPointer;
        }

        function getTransferableValue(value: any): PrimitiveOrPointer {
            // internationally ignoring the case of (typeof document.all === 'undefined') because
            // in the reserve membrane, you never get one of those exotic objects
            if (typeof value === 'undefined') {
                return undefined;
            }
            return isPrimitiveValue(value) ? value : getTransferablePointer(value);
        }

        function getPartialDescriptorMeta(
            partialDesc: PropertyDescriptor
        ): Parameters<CallableDescriptorCallback> {
            const { configurable, enumerable, writable, value, get, set } = partialDesc;
            return [
                'configurable' in partialDesc ? !!configurable : UNDEFINED_SYMBOL,
                'enumerable' in partialDesc ? !!enumerable : UNDEFINED_SYMBOL,
                'writable' in partialDesc ? !!writable : UNDEFINED_SYMBOL,
                'value' in partialDesc ? getTransferableValue(value) : UNDEFINED_SYMBOL,
                'get' in partialDesc ? getTransferableValue(get) : UNDEFINED_SYMBOL,
                'set' in partialDesc ? getTransferableValue(set) : UNDEFINED_SYMBOL,
            ];
        }

        function lockShadowTarget(shadowTarget: ShadowTarget, targetPointer: Pointer) {
            copyForeignDescriptorsIntoShadowTarget(shadowTarget, targetPointer);
            const protoPointer = foreignCallableGetPrototypeOf(targetPointer);
            // setting up __proto__ of the shadowTarget
            ReflectSetPrototypeOf(shadowTarget, getLocalValue(protoPointer));
            // locking down the extensibility of shadowTarget
            ReflectPreventExtensions(shadowTarget);
        }

        class BoundaryProxyHandler implements ProxyHandler<ShadowTarget> {
            // public fields
            revoke: () => void;

            proxy: ShadowTarget;

            ownKeys: ProxyHandler<ShadowTarget>['ownKeys'];

            isExtensible: ProxyHandler<ShadowTarget>['isExtensible'];

            getOwnPropertyDescriptor: ProxyHandler<ShadowTarget>['getOwnPropertyDescriptor'];

            getPrototypeOf: ProxyHandler<ShadowTarget>['getPrototypeOf'];

            get: ProxyHandler<ShadowTarget>['get'];

            set: ProxyHandler<ShadowTarget>['set'];

            has: ProxyHandler<ShadowTarget>['has'];

            setPrototypeOf: ProxyHandler<ShadowTarget>['setPrototypeOf'];

            deleteProperty: ProxyHandler<ShadowTarget>['deleteProperty'];

            preventExtensions: ProxyHandler<ShadowTarget>['preventExtensions'];

            defineProperty: ProxyHandler<ShadowTarget>['defineProperty'];

            // the purpose of this public field is to help developers to identify
            // what side of the membrane they are debugging.
            readonly color = color;

            // memoized live marker check
            private get targetMarkedAsLive() {
                // assert: trapMutations must be true
                const value = isMarked(this.targetPointer, LOCKER_LIVE_MARKER_SYMBOL);
                ReflectDefineProperty(this, 'targetMarkedAsLive', { value });
                return value;
            }

            // memoized magic marker check
            private get targetMarkedAsMagic() {
                const value = SUPPORT_MAGIC_MARKER
                    ? isMarked(this.targetPointer, LOCKER_MAGIC_MARKER_SYMBOL)
                    : false;
                ReflectDefineProperty(this, 'targetMarkedAsMagic', { value });
                return value;
            }

            // callback to prepare the foreign realm before any operation
            private readonly targetPointer: Pointer;

            // apply trap is generic, and should never change independently of the type of membrane
            readonly apply = function applyTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                thisArg: any,
                args: any[]
            ): any {
                const { targetPointer } = this;
                const thisArgValueOrPointer = getTransferableValue(thisArg);
                const combinedArgs = [targetPointer, thisArgValueOrPointer];
                const { length: argsLen } = args;
                const { length: combinedOffset } = combinedArgs;
                combinedArgs.length += argsLen;
                for (let i = 0, len = argsLen; i < len; i += 1) {
                    combinedArgs[i + combinedOffset] = getTransferableValue(args[i]);
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
                const { targetPointer } = this;
                if (newTarget === undefined) {
                    throw new TypeErrorCtor();
                }
                const newTargetPointer = getTransferableValue(newTarget);
                const combinedArgs = [targetPointer, newTargetPointer];
                const { length: argsLen } = args;
                const { length: combinedOffset } = combinedArgs;
                combinedArgs.length += argsLen;
                for (let i = 0, len = argsLen; i < len; i += 1) {
                    combinedArgs[i + combinedOffset] = getTransferableValue(args[i]);
                }
                return getLocalValue(
                    ReflectApply(foreignCallableConstruct, undefined, combinedArgs)
                );
            };

            constructor(
                targetPointer: Pointer,
                targetTraits: TargetTraits,
                targetFunctionName: string | undefined
            ) {
                this.targetPointer = targetPointer;
                const shadowTarget = createShadowTarget(targetTraits, targetFunctionName);
                const { proxy, revoke } = ProxyRevocable(shadowTarget, this);
                this.proxy = proxy;
                this.revoke = revoke;
                // inserting default traps
                this.ownKeys = BoundaryProxyHandler.defaultOwnKeysTrap;
                this.isExtensible = BoundaryProxyHandler.defaultIsExtensibleTrap;
                this.getOwnPropertyDescriptor =
                    BoundaryProxyHandler.defaultGetOwnPropertyDescriptorTrap;
                this.getPrototypeOf = BoundaryProxyHandler.defaultGetPrototypeOfTrap;
                this.get = BoundaryProxyHandler.defaultGetTrap;
                this.has = BoundaryProxyHandler.defaultHasTrap;
                // @ts-ignore
                this.setPrototypeOf = BoundaryProxyHandler.defaultSetPrototypeOfTrap;
                // @ts-ignore
                this.set = BoundaryProxyHandler.defaultSetTrap;
                // @ts-ignore
                this.deleteProperty = BoundaryProxyHandler.defaultDeletePropertyTrap;
                // @ts-ignore
                this.preventExtensions = BoundaryProxyHandler.defaultPreventExtensionsTrap;
                // @ts-ignore
                this.defineProperty = BoundaryProxyHandler.defaultDefinePropertyTrap;
                if (targetTraits & TargetTraits.Revoked) {
                    revoke();
                }
                if (!trapMutations) {
                    // if local mutations are not trapped, then freezing the handler is ok
                    // because it is not expecting to change in the future.
                    // future optimization: hoping that proxies with frozen handlers can be faster
                    ObjectFreeze(this);
                }
            }

            // internal utilities
            private makeProxyDynamic() {
                // assert: trapMutations must be true
                // replacing pending traps with dynamic traps that can work with the target
                // without taking snapshots.
                // @ts-ignore
                this.set = BoundaryProxyHandler.dynamicSetTrap;
                // @ts-ignore
                this.deleteProperty = BoundaryProxyHandler.dynamicDeletePropertyTrap;
                // @ts-ignore
                this.setPrototypeOf = BoundaryProxyHandler.dynamicSetPrototypeOfTrap;
                // @ts-ignore
                this.preventExtensions = BoundaryProxyHandler.dynamicPreventExtensionsTrap;
                // @ts-ignore
                this.defineProperty = BoundaryProxyHandler.dynamicDefinePropertyTrap;
                // future optimization: hoping that proxies with frozen handlers can be faster
                ObjectFreeze(this);
            }

            private makeProxyStatic(shadowTarget: ShadowTarget) {
                // assert: trapMutations must be true
                const { targetPointer } = this;
                const targetIntegrityTraits = foreignCallableGetTargetIntegrityTraits(
                    targetPointer
                );
                if (targetIntegrityTraits & TargetIntegrityTraits.Revoked) {
                    // the target is a revoked proxy, in which case we revoke
                    // this proxy as well.
                    this.revoke();
                    return;
                }
                // adjusting the proto chain of the shadowTarget
                let protoPointer = null;
                try {
                    // a proxy that revoke itself when the __proto__ is accessed can break
                    // the membrane, therefore we need protection
                    protoPointer = foreignCallableGetPrototypeOf(targetPointer);
                    ReflectSetPrototypeOf(shadowTarget, getLocalValue(protoPointer));
                } catch {
                    // TODO: is revoke the right action here? maybe just setting proto to
                    // null instead?
                    this.revoke();
                    return;
                }
                // defining own descriptors
                copyForeignDescriptorsIntoShadowTarget(shadowTarget, targetPointer);
                // preserving the semantics of the object
                if (targetIntegrityTraits & TargetIntegrityTraits.IsFrozen) {
                    ObjectFreeze(shadowTarget);
                } else if (targetIntegrityTraits & TargetIntegrityTraits.IsSealed) {
                    ObjectSeal(shadowTarget);
                } else if (targetIntegrityTraits & TargetIntegrityTraits.IsNotExtensible) {
                    ReflectPreventExtensions(shadowTarget);
                }
                // resetting all traps except apply and construct for static proxies since the
                // proxy target is the shadow target and all operations are going to be applied
                // to it rather than the real target.
                this.getOwnPropertyDescriptor = ReflectOwnPropertyDescriptor;
                this.getPrototypeOf = ReflectGetPrototypeOf;
                this.get = ReflectGet;
                this.has = ReflectHas;
                this.ownKeys = ReflectOwnKeys;
                this.isExtensible = ReflectIsExtensible;
                this.set = ReflectSet;
                this.defineProperty = ReflectDefineProperty;
                this.deleteProperty = ReflectDeleteProperty;
                this.setPrototypeOf = ReflectSetPrototypeOf;
                this.preventExtensions = ReflectPreventExtensions;
                // future optimization: hoping that proxies with frozen handlers can be faster
                ObjectFreeze(this);
            }

            private makeProxyUnambiguous(shadowTarget: ShadowTarget) {
                // assert: trapMutations must be true
                if (this.targetMarkedAsLive) {
                    // when the target has the a descriptor for the magic symbol,
                    // use the Dynamic traps
                    this.makeProxyDynamic();
                } else {
                    this.makeProxyStatic(shadowTarget);
                }
            }

            // logic implementation of all traps

            // dynamic traps
            private static dynamicDefinePropertyTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                key: PropertyKey,
                partialDesc: PropertyDescriptor
            ): boolean | undefined {
                const { targetPointer } = this;
                const descMeta = getPartialDescriptorMeta(partialDesc);
                // Perf: Optimization to avoid hitting Symbol.iterator, which will
                // normally be: foreignCallableDefineProperty(targetPointer, key, ...descMeta)
                const args = [targetPointer, key];
                ReflectApply(
                    ArrayProtoPush,
                    args, // first two arguments
                    descMeta // rest arguments
                );
                const result = ReflectApply(foreignCallableDefineProperty, undefined, args);
                if (result) {
                    const [configurable] = descMeta;
                    // intentionally testing against true since it could be undefined as well
                    if (configurable === false) {
                        copyForeignDescriptorIntoShadowTarget(shadowTarget, targetPointer, key);
                    }
                }
                return result;
            }

            private static dynamicDeletePropertyTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                key: PropertyKey
            ): boolean | undefined {
                const { targetPointer } = this;
                return foreignCallableDeleteProperty(targetPointer, key);
            }

            private static dynamicGetOwnPropertyDescriptorTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                key: PropertyKey
            ): PropertyDescriptor | undefined {
                const { targetPointer } = this;
                let desc: PropertyDescriptor | undefined;
                const callbackWithDescriptor: CallableDescriptorCallback = (...descMeta) => {
                    desc = ReflectApply(createDescriptorFromMeta, undefined, descMeta);
                };
                foreignCallableGetOwnPropertyDescriptor(targetPointer, key, callbackWithDescriptor);
                if (desc === undefined) {
                    return desc!;
                }
                if (desc!.configurable === false) {
                    // updating the descriptor to non-configurable on the shadow
                    copyForeignDescriptorIntoShadowTarget(shadowTarget, targetPointer, key);
                }
                return desc;
            }

            private static dynamicGetPrototypeOfTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget
            ): any {
                const { targetPointer } = this;
                const protoPointer = foreignCallableGetPrototypeOf(targetPointer);
                return getLocalValue(protoPointer);
            }

            private static dynamicIsExtensibleTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget
            ): boolean {
                // optimization to avoid attempting to lock down the shadowTarget multiple times
                if (!ReflectIsExtensible(shadowTarget)) {
                    return false; // was already locked down
                }
                const { targetPointer } = this;
                if (!foreignCallableIsExtensible(targetPointer)) {
                    lockShadowTarget(shadowTarget, targetPointer);
                    return false;
                }
                return true;
            }

            private static dynamicOwnKeysTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget
            ): (string | symbol)[] {
                const { targetPointer } = this;
                let keys: (string | symbol)[] = [];
                const callableKeysCallback = (...args: (string | symbol)[]) => {
                    keys = args;
                };
                foreignCallableOwnKeys(targetPointer, callableKeysCallback);
                return keys;
            }

            private static dynamicPreventExtensionsTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget
            ): boolean | undefined {
                const { targetPointer } = this;
                if (ReflectIsExtensible(shadowTarget)) {
                    if (!foreignCallablePreventExtensions(targetPointer)) {
                        // if the target is a proxy manually created, it might reject
                        // the preventExtension call, in which case we should not attempt
                        // to lock down the shadow target.
                        if (!foreignCallableIsExtensible(targetPointer)) {
                            lockShadowTarget(shadowTarget, targetPointer);
                        }
                        return false;
                    }
                    lockShadowTarget(shadowTarget, targetPointer);
                }
                return true;
            }

            private static dynamicSetPrototypeOfTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                prototype: object | null
            ): boolean | undefined {
                const { targetPointer } = this;
                const protoValueOrPointer = getTransferableValue(prototype);
                return foreignCallableSetPrototypeOf(targetPointer, protoValueOrPointer);
            }

            // dynamic with proto chain traversal traps:

            /**
             * Dynamic traps with proto chain traversal capabilities are the exception of
             * the rules here, the problem is that the other side might or might not have:
             * a) local mutations only
             * b) distortions
             *
             * Therefore, the logic has to be bound to the caller (the one initiating the
             * across membrane access).
             */

            /**
             * This trap cannot just use `Reflect.has` or the `in` operator directly because
             * the red object graph might have mutations that are only visible on the red side,
             * which means looking into `target` directly is not viable. Instead, we need to
             * implement a more crafty solution that looks into target's own properties, or
             * in the red proto chain when needed.
             *
             * In a transparent membrane, this method will have been a lot simpler, like:
             *
             *      const { targetPointer } = this;
             *      return foreignCallableHas(targetPointer, key);
             *
             */
            private static dynamicHasTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                key: PropertyKey
            ): boolean {
                // assert: trapMutations must be true
                const { targetPointer } = this;
                if (foreignCallableHasOwnProperty(targetPointer, key)) {
                    return true;
                }
                // avoiding calling the has trap for any proto chain operation, instead we
                // implement the regular logic here in this trap.
                const protoPointer = foreignCallableGetPrototypeOf(targetPointer);
                if (protoPointer === null) {
                    return false;
                }
                let O: object | null = getLocalValue(protoPointer);
                // return has(O, key);
                while (O !== null) {
                    if (ReflectApply(ObjectProtoHasOwnProperty, O, [key])) {
                        return true;
                    }
                    O = ReflectGetPrototypeOf(O);
                }
                return false;
            }

            /**
             * This trap cannot just use `ReflectGet` directly on the `target` because
             * the red object graph might have mutations that are only visible on the red side,
             * which means looking into `target` directly is not viable. Instead, we need to
             * implement a more crafty solution that looks into target's own properties, or
             * in the red proto chain when needed.
             *
             * In a transparent membrane, this method will have been a lot simpler, like:
             *
             *   const { targetPointer } = this;
             *   const receiverPointer = getValueOrPointer(receiver);
             *   const foreignValueOrCallable =
             *      foreignCallableGet(targetPointer, key, receiverPointer);
             *   return getLocalValue(foreignValueOrCallable);
             *
             */
            private static dynamicGetTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                key: PropertyKey,
                receiver: any
            ): any {
                // assert: trapMutations must be true
                let O: object | null = this.proxy;
                while (O !== null) {
                    if (ReflectApply(ObjectProtoHasOwnProperty, O, [key])) {
                        // we know this is a single stop lookup because it has own property
                        const { get: getter, value: localValue } = ReflectOwnPropertyDescriptor(
                            O,
                            key
                        )!;
                        if (getter) {
                            // even though the getter function exists, we can't use Reflect.get
                            // because there might be a distortion for that getter function, in
                            // which case we must resolve the local getter and call it instead.
                            return ReflectApply(getter, receiver, []);
                        }
                        // descriptor exists without a getter
                        return localValue;
                    }
                    O = ReflectGetPrototypeOf(O);
                }
                return undefined;
            }

            /**
             * This trap cannot just use `ReflectSet` directly on the `target` because
             * the red object graph might have mutations that are only visible on the red side,
             * which means looking into `target` directly is not viable. Instead, we need to
             * implement a more crafty solution that looks into target's own properties, or
             * in the red proto chain when needed.
             *
             *  const { targetPointer } = this;
             *  const valuePointer = getValueOrPointer(value);
             *  const receiverPointer = getValueOrPointer(receiver);
             *  return foreignCallableSet(targetPointer, key, valuePointer, receiverPointer);
             *
             */
            private static dynamicSetTrap(
                this: BoundaryProxyHandler,
                _shadowTarget: ShadowTarget,
                key: string | symbol,
                value: any,
                receiver: any
            ): boolean | undefined {
                // assert: trapMutations must be true
                const { targetPointer } = this;
                let O: object | null = this.proxy;
                while (O !== null) {
                    if (ReflectApply(ObjectProtoHasOwnProperty, O, [key])) {
                        // we know this is a single stop lookup because it has own property
                        const { get: getter, set: setter } = ReflectOwnPropertyDescriptor(O, key)!;
                        if (setter) {
                            // even though the setter function exists, we can't use Reflect.set
                            // because there might be a distortion for that setter function, in
                            // which case we must resolve the local setter and call it instead.
                            ReflectApply(setter, receiver, [value]);
                            // if there is a setter, it either throw or we can assume the
                            // value was set
                            return true;
                        }
                        if (getter) {
                            // accessor descriptor exists without a setter
                            return false;
                        }
                        return this.targetMarkedAsMagic
                            ? // workaround for Safari <= 14 bug on CSSStyleDeclaration
                              // objects which lose their magic setters if set with
                              // defineProperty
                              ReflectSet(O, key, value, O)
                            : // setting the descriptor with only a value entry should
                              // not affect existing descriptor traits
                              ReflectDefineProperty(O, key, { value });
                    }
                    O = ReflectGetPrototypeOf(O);
                }
                // if it is not an accessor property, is either a getter only accessor
                // or a data property, in which case we use Reflect.set to set the value,
                // and no receiver is needed since it will simply set the data property or nothing
                const valuePointer = getTransferableValue(value);
                return foreignCallableDefineProperty(
                    targetPointer,
                    key,
                    true,
                    true,
                    true,
                    valuePointer,
                    UNDEFINED_SYMBOL,
                    UNDEFINED_SYMBOL
                );
            }

            // pending traps
            private static pendingSetPrototypeOfTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                prototype: object | null
            ): boolean | undefined {
                // assert: trapMutations must be true
                this.makeProxyUnambiguous(shadowTarget);
                return this.setPrototypeOf?.(shadowTarget, prototype);
            }

            private static pendingSetTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                key: string | symbol,
                value: any,
                receiver: any
            ): boolean | undefined {
                // assert: trapMutations must be true
                this.makeProxyUnambiguous(shadowTarget);
                return this.set?.(shadowTarget, key, value, receiver);
            }

            private static pendingDeletePropertyTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                key: string | symbol
            ): boolean | undefined {
                // assert: trapMutations must be true
                this.makeProxyUnambiguous(shadowTarget);
                return this.deleteProperty?.(shadowTarget, key);
            }

            private static pendingPreventExtensionsTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget
            ): boolean | undefined {
                // assert: trapMutations must be true
                this.makeProxyUnambiguous(shadowTarget);
                return this.preventExtensions?.(shadowTarget);
            }

            private static pendingDefinePropertyTrap(
                this: BoundaryProxyHandler,
                shadowTarget: ShadowTarget,
                key: string | symbol,
                partialDesc: PropertyDescriptor
            ): boolean | undefined {
                // assert: trapMutations must be true
                this.makeProxyUnambiguous(shadowTarget);
                return this.defineProperty?.(shadowTarget, key, partialDesc);
            }

            // static default traps (optimization to avoid computations of the proper
            // trap in constructor)
            private static defaultOwnKeysTrap = BoundaryProxyHandler.dynamicOwnKeysTrap;

            private static defaultIsExtensibleTrap = BoundaryProxyHandler.dynamicIsExtensibleTrap;

            private static defaultGetOwnPropertyDescriptorTrap =
                BoundaryProxyHandler.dynamicGetOwnPropertyDescriptorTrap;

            private static defaultGetPrototypeOfTrap =
                BoundaryProxyHandler.dynamicGetPrototypeOfTrap;

            private static defaultGetTrap = BoundaryProxyHandler.dynamicGetTrap;

            private static defaultHasTrap = BoundaryProxyHandler.dynamicHasTrap;

            // pending traps are only really needed if this membrane
            // traps mutations to avoid mutations operations on the
            // side of the membrane.
            // TODO: find a way to optimize the declaration rather than instantiation
            private static defaultSetPrototypeOfTrap = trapMutations
                ? BoundaryProxyHandler.pendingSetPrototypeOfTrap
                : BoundaryProxyHandler.dynamicSetPrototypeOfTrap;

            private static defaultSetTrap = trapMutations
                ? BoundaryProxyHandler.pendingSetTrap
                : BoundaryProxyHandler.dynamicSetTrap;

            private static defaultDeletePropertyTrap = trapMutations
                ? BoundaryProxyHandler.pendingDeletePropertyTrap
                : BoundaryProxyHandler.dynamicDeletePropertyTrap;

            private static defaultPreventExtensionsTrap = trapMutations
                ? BoundaryProxyHandler.pendingPreventExtensionsTrap
                : BoundaryProxyHandler.dynamicPreventExtensionsTrap;

            private static defaultDefinePropertyTrap = trapMutations
                ? BoundaryProxyHandler.pendingDefinePropertyTrap
                : BoundaryProxyHandler.dynamicDefinePropertyTrap;
        }
        ReflectSetPrototypeOf(BoundaryProxyHandler.prototype, null);

        // future optimization: hoping that proxies with frozen handlers can be faster
        ObjectFreeze(BoundaryProxyHandler.prototype);

        function createLazyDescriptor(
            unforgeable: object,
            key: PropertyKey,
            isEnumerable: boolean
        ): PropertyDescriptor {
            const targetPointer = getTransferablePointer(unforgeable);
            let desc: PropertyDescriptor;
            const callbackWithDescriptor: CallableDescriptorCallback = (...descMeta) => {
                desc = ReflectApply(createDescriptorFromMeta, undefined, descMeta);
            };
            // the role of this descriptor is to serve as a bouncer, when either a getter
            // or a setter is accessed, the descriptor will be replaced with the descriptor
            // from the foreign side and the get/set operation will be carry on from there.
            // TODO: somehow we need to track the unforgeable/key value pairs in case the
            // local realm ever attempt to access the descriptor, in which case the same
            // mechanism must be applied
            return {
                enumerable: isEnumerable,
                configurable: true,
                get(): any {
                    foreignCallableGetOwnPropertyDescriptor(
                        targetPointer,
                        key,
                        callbackWithDescriptor
                    );
                    if (desc! === undefined) {
                        delete unforgeable[key];
                    } else {
                        ReflectDefineProperty(unforgeable, key, desc);
                    }
                    return ReflectGet(unforgeable, key);
                },
                set(v: any) {
                    foreignCallableGetOwnPropertyDescriptor(
                        targetPointer,
                        key,
                        callbackWithDescriptor
                    );
                    if (desc! === undefined) {
                        delete unforgeable[key];
                    } else {
                        ReflectDefineProperty(unforgeable, key, desc);
                    }
                    ReflectSet(unforgeable, key, v);
                },
            };
        }

        // exporting callable hooks for a foreign realm
        foreignCallableHooksCallback(
            // globalThisPointer
            // When crossing, should be mapped to the foreign globalThis
            createPointer(globalThis),
            // getSelectedTarget
            getSelectedTarget,
            // getTransferableValue
            getTransferableValue,
            // callableGetPropertyValuePointer: this callable function allows the foreign
            // realm to access a linkable pointer for a property value. In
            // order to do that, the foreign side must provide a pointer and a key
            // access the value in order to produce a pointer
            (targetPointer: Pointer, key: PropertyKey) => {
                targetPointer();
                const target = getSelectedTarget();
                const value: ProxyTarget = target[key];
                // TODO: what if the value is not a valid proxy target?
                return createPointer(value);
            },
            // callableEvaluate
            (sourceText: string): void => {
                // no need to return the result of the eval
                try {
                    cachedLocalEval(sourceText);
                } catch (e) {
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
            // callableInstallLazyDescriptors
            (targetPointer: Pointer, ...keyAndEnumTuple: PropertyKey[]) => {
                targetPointer();
                const target = getSelectedTarget();
                for (let i = 0, len = keyAndEnumTuple.length; i < len; i += 2) {
                    const key = keyAndEnumTuple[i];
                    const isEnumerable = !!keyAndEnumTuple[i + 1];
                    const descriptor = createLazyDescriptor(target, key, isEnumerable);
                    try {
                        // installing lazy descriptors into the local unforgeable reference
                        ReflectDefineProperty(target, key, descriptor);
                    } catch {
                        // this could happen if the foreign side attempt to install a
                        // descriptor that exists already on this side as non-configurable
                        // in which case we will probably just ignore the error.
                        // TODO: should we really just ignore it?
                    }
                }
            },
            /**
             * callablePushTarget: This function can be used by a foreign realm to install a proxy
             * into this realm that correspond to an object from the foreign realm. It returns
             * a Pointer that can be used by the foreign realm to pass back a reference to this
             * realm when passing arguments or returning from a foreign callable invocation. This
             * function is extremely important to understand the mechanics of this membrane.
             */
            (
                pointer: () => void,
                targetTraits: TargetTraits,
                targetFunctionName: string | undefined
            ): Pointer => {
                const { proxy } = new BoundaryProxyHandler(
                    pointer,
                    targetTraits,
                    targetFunctionName
                );
                ReflectApply(WeakMapProtoSet, proxyTargetToPointerMap, [proxy, pointer]);
                return createPointer(proxy);
            },
            // callableApply
            instrumentCallableWrapper(
                (
                    targetPointer: Pointer,
                    thisArgValueOrPointer: PrimitiveOrPointer,
                    ...listOfValuesOrPointers: PrimitiveOrPointer[]
                ): PrimitiveOrPointer => {
                    targetPointer();
                    const fn = getSelectedTarget();
                    const thisArg = getLocalValue(thisArgValueOrPointer);
                    const { length: argsLen } = listOfValuesOrPointers;
                    const args = new ArrayCtor(argsLen);
                    for (let i = 0, len = argsLen; i < len; i += 1) {
                        args[i] = getLocalValue(listOfValuesOrPointers[i]);
                    }
                    let value;
                    try {
                        value = ReflectApply(fn, thisArg, args);
                    } catch (e) {
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
                    newTargetPointer: PrimitiveOrPointer,
                    ...listOfValuesOrPointers: PrimitiveOrPointer[]
                ): PrimitiveOrPointer => {
                    targetPointer();
                    const constructor = getSelectedTarget();
                    const newTarget = getLocalValue(newTargetPointer);
                    const { length: argsLen } = listOfValuesOrPointers;
                    const args = new ArrayCtor(argsLen);
                    for (let i = 0, len = argsLen; i < len; i += 1) {
                        args[i] = getLocalValue(listOfValuesOrPointers[i]);
                    }
                    let value;
                    try {
                        value = ReflectConstruct(constructor, args, newTarget);
                    } catch (e) {
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
                    key: PropertyKey,
                    ...descMeta: Parameters<CallableDescriptorCallback>
                ): boolean => {
                    targetPointer();
                    const target = getSelectedTarget();
                    const desc = ReflectApply(createDescriptorFromMeta, undefined, descMeta);
                    try {
                        return ReflectDefineProperty(target, key, desc);
                    } catch (e) {
                        throw pushErrorAcrossBoundary(e);
                    }
                },
                'callableDefineProperty',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableDeleteProperty
            instrumentCallableWrapper(
                (targetPointer: Pointer, key: PropertyKey): boolean => {
                    targetPointer();
                    const target = getSelectedTarget();
                    try {
                        return ReflectDeleteProperty(target, key);
                    } catch (e) {
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
                    key: PropertyKey,
                    foreignCallableDescriptorCallback: CallableDescriptorCallback
                ): void => {
                    targetPointer();
                    const target = getSelectedTarget();
                    let desc;
                    try {
                        desc = ReflectOwnPropertyDescriptor(target, key);
                    } catch (e) {
                        throw pushErrorAcrossBoundary(e);
                    }
                    if (!desc) {
                        return;
                    }
                    const descMeta = getPartialDescriptorMeta(desc);
                    ReflectApply(foreignCallableDescriptorCallback, undefined, descMeta);
                },
                'callableGetOwnPropertyDescriptor',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableGetPrototypeOf
            instrumentCallableWrapper(
                (targetPointer: Pointer): PrimitiveOrPointer => {
                    targetPointer();
                    const target = getSelectedTarget();
                    let proto;
                    try {
                        proto = ReflectGetPrototypeOf(target);
                    } catch (e) {
                        throw pushErrorAcrossBoundary(e);
                    }
                    return getTransferableValue(proto);
                },
                'callableGetPrototypeOf',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableHas
            instrumentCallableWrapper(
                (targetPointer: Pointer, key: PropertyKey): boolean => {
                    targetPointer();
                    const target = getSelectedTarget();
                    try {
                        return ReflectHas(target, key);
                    } catch (e) {
                        throw pushErrorAcrossBoundary(e);
                    }
                },
                'callableHas',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableIsExtensible
            instrumentCallableWrapper(
                (targetPointer: Pointer): boolean => {
                    targetPointer();
                    const target = getSelectedTarget();
                    try {
                        return ReflectIsExtensible(target);
                    } catch (e) {
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
                    foreignCallableKeysCallback: (...args: (string | symbol)[]) => void
                ): void => {
                    targetPointer();
                    const target = getSelectedTarget();
                    let keys;
                    try {
                        keys = ReflectOwnKeys(target) as (string | symbol)[];
                    } catch (e) {
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
                    } catch (e) {
                        throw pushErrorAcrossBoundary(e);
                    }
                },
                'callablePreventExtensions',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableSetPrototypeOf
            instrumentCallableWrapper(
                (targetPointer: Pointer, protoValueOrPointer: PrimitiveOrPointer): boolean => {
                    targetPointer();
                    const target = getSelectedTarget();
                    const proto = getLocalValue(protoValueOrPointer);
                    try {
                        return ReflectSetPrototypeOf(target, proto);
                    } catch (e) {
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
                },
                'callableGetTargetIntegrityTraits',
                INBOUND_INSTRUMENTATION_LABEL
            ),
            // callableHasOwnProperty
            instrumentCallableWrapper(
                (targetPointer: Pointer, key: PropertyKey): boolean => {
                    targetPointer();
                    const target = getSelectedTarget();
                    try {
                        return ReflectApply(ObjectProtoHasOwnProperty, target, [key]);
                    } catch (e) {
                        throw pushErrorAcrossBoundary(e);
                    }
                },
                'callableHasOwnProperty',
                INBOUND_INSTRUMENTATION_LABEL
            )
        );
        return (...hooks: Parameters<HooksCallback>) => {
            // prettier-ignore
            const [,,,,,,,
                callablePushTarget,
                callableApply,
                callableConstruct,
                callableDefineProperty,
                callableDeleteProperty,
                callableGetOwnPropertyDescriptor,
                callableGetPrototypeOf,
                callableHas,
                callableIsExtensible,
                callableOwnKeys,
                callablePreventExtensions,
                callableSetPrototypeOf,
                callableGetTargetIntegrityTraits,
                callableHasOwnProperty,
            ] = hooks;
            foreignCallablePushTarget = callablePushTarget;
            // traps utilities
            // prettier-ignore
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
            // prettier-ignore
            foreignCallableHas = foreignErrorControl(
                instrumentCallableWrapper(
                    callableHas,
                    'callableHas',
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
            // prettier-ignore
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

const TypeErrorCtor = TypeError;
const marshallSourceTextInStrictMode = `(function(){'use strict';return (${createMembraneMarshall.toString()})})()`;
// eslint-disable-next-line no-eval
export function createConnector(evaluator: typeof eval) {
    if (!evaluator) {
        throw new TypeErrorCtor('Missing evaluator function');
    }
    // The result of this eval will be a function that returns a function.
    // The hooks connector is the last returned function, so we invoke the
    // result of the eval operation and return that result.
    return evaluator(marshallSourceTextInStrictMode)();
}
