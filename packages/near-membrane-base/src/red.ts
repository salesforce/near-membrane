/* eslint-disable @typescript-eslint/no-use-before-define */
/**
 * This file implements a serializable factory function that is invoked once per sandbox
 * and it is used to create red proxies where all identities are defined inside
 * the sandbox, this guarantees that any error when interacting with those proxies, has
 * the proper identity to avoid leaking references from the blue realm into the sandbox
 * this is especially important for out of memory errors.
 *
 * IMPORTANT:
 *  - This file can't import anything from the package, only types since it is going to
 *    be serialized, and therefore it will loose the reference.
 */
import {
    RedArray,
    RedObject,
    RedProxy,
    RedProxyTarget,
    RedShadowTarget,
    RedValue,
    BlueArray,
    BlueConstructor,
    BlueFunction,
    BlueObject,
    BlueValue,
    MembraneBroker,
    TargetMeta,
} from './types';

/**
 * Blink (Chrome) imposes certain restrictions for detached iframes, specifically,
 * any callback (or potentially a constructor) invoked from a detached iframe
 * will throw an error as detailed here:
 *
 *  - https://bugs.chromium.org/p/chromium/issues/detail?id=1042435#c4
 *
 * This restriction seems some-how arbitrary at this point because you can easily
 * bypass it by preserving the following two invariants:
 *
 * 1. a call to a dom DOM API must be done from the main window.
 * 2. any callback passed into a DOM API must be wrapped with a
 *    proxy from the main realm.
 *
 * For that, the environment must provide two hooks that when called
 * they will delegate to Reflect.apply/Reflect.construct on the blue
 * realm, you cannot call Reflect.* from inside the sandbox or the blue
 * realm directly, it must be a wrapping function.
 */
export interface MarshalHooks {
    apply(
        target: BlueFunction,
        thisArgument: BlueValue,
        argumentsList: ArrayLike<BlueValue>
    ): BlueValue;
    construct(
        target: BlueConstructor,
        argumentsList: ArrayLike<BlueValue>,
        newTarget?: any
    ): BlueValue;
}

// istanbul ignore next
export const serializedRedEnvSourceText = /* prettier-ignore */ (function redEnvFactory(
    blueEnv: MembraneBroker,
    hooks: MarshalHooks
) {
    const LockerLiveValueMarkerSymbol = Symbol.for('@@lockerLiveValue');
    const { blueMap, distortionMap } = blueEnv;
    const { apply: blueApplyHook, construct: blueConstructHook } = hooks;

    const ArrayCtor = Array;
    const ErrorCtor = Error;
    const TypeErrorCtor = TypeError;
    const emptyArray: [] = [];
    const noop = () => undefined;

    const { isArray: isArrayOrNotOrThrowForRevoked } = Array;

    const {
        assign: ObjectAssign,
        create: ObjectCreate,
        defineProperties: ObjectDefineProperties,
        getOwnPropertyDescriptors: ObjectGetOwnPropertyDescriptors,
        freeze: ObjectFreeze,
        seal: ObjectSeal,
        isSealed: ObjectIsSealed,
        isFrozen: ObjectIsFrozen,
    } = Object;

    const {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        __lookupGetter__: ObjectProto__lookupGetter__,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        __lookupSetter__: ObjectProto__lookupSetter__,
        hasOwnProperty: ObjectProtoHasOwnProperty,
    } = Object.prototype as any;

    const { revocable: ProxyRevocable } = Proxy;

    const {
        apply: ReflectApply,
        isExtensible: ReflectIsExtensible,
        getOwnPropertyDescriptor: ReflectGetOwnPropertyDescriptor,
        setPrototypeOf: ReflectSetPrototypeOf,
        getPrototypeOf: ReflectGetPrototypeOf,
        preventExtensions: ReflectPreventExtensions,
        deleteProperty: ReflectDeleteProperty,
        ownKeys: ReflectOwnKeys,
        defineProperty: ReflectDefineProperty,
        get: ReflectGet,
        set: ReflectSet,
        has: ReflectHas,
    } = Reflect;

    const { get: WeakMapProtoGet, has: WeakMapProtoHas } = WeakMap.prototype;

    function ObjectHasOwnProperty(obj: object | undefined, key: PropertyKey): boolean {
        return (
            obj !== null && obj !== undefined && ReflectApply(ObjectProtoHasOwnProperty, obj, [key])
        );
    }

    function ObjectLookupGetter(obj: object | undefined, key: PropertyKey): Function | undefined {
        return obj === null || obj === undefined
            ? undefined
            : ReflectApply(ObjectProto__lookupGetter__, obj, [key]);
    }

    function ObjectLookupSetter(obj: object | undefined, key: PropertyKey): Function | undefined {
        return obj === null || obj === undefined
            ? ReflectApply(ObjectProto__lookupSetter__, obj, [key])
            : undefined;
    }

    function WeakMapGet(map: WeakMap<object, object>, key: object): object | undefined {
        return ReflectApply(WeakMapProtoGet, map, [key]);
    }

    function WeakMapHas(map: WeakMap<object, object>, key: object): boolean {
        return ReflectApply(WeakMapProtoHas, map, [key]);
    }

    function copyBlueDescriptorIntoShadowTarget(
        shadowTarget: RedShadowTarget,
        normalizedBlueDescriptor: PropertyDescriptor | undefined,
        key: PropertyKey
    ) {
        // Note: a property might get defined multiple times in the shadowTarget
        //       if the user calls defineProperty or similar mechanism multiple times
        //       but it will always be compatible with the previous descriptor
        //       to preserve the object invariants, which makes these lines safe.
        if (normalizedBlueDescriptor !== undefined) {
            const redDesc = getRedDescriptor(normalizedBlueDescriptor);
            ReflectDefineProperty(shadowTarget, key, redDesc);
        }
    }

    function copyBlueDescriptorsIntoShadowTarget(
        shadowTarget: RedShadowTarget,
        originalTarget: RedProxyTarget
    ) {
        const normalizedBlueDescriptors = ObjectGetOwnPropertyDescriptors(originalTarget);
        const targetKeys = ReflectOwnKeys(normalizedBlueDescriptors);
        const redDescriptors = ObjectCreate(null);
        for (let i = 0, len = targetKeys.length; i < len; i += 1) {
            const key = targetKeys[i] as string;
            const redDesc = getRedDescriptor(normalizedBlueDescriptors[key]);
            redDescriptors[key] = redDesc;
        }
        // Use `ObjectDefineProperties()` instead of individual `defineProperty()`
        // calls for better performance.
        ObjectDefineProperties(shadowTarget, redDescriptors);
    }

    function copyRedOwnDescriptors(
        shadowTarget: RedShadowTarget,
        blueDescriptors: PropertyDescriptorMap
    ) {
        const keys = ReflectOwnKeys(blueDescriptors);
        for (let i = 0, len = keys.length; i < len; i += 1) {
            const key = keys[i];
            // avoid poisoning by checking own properties from descriptors
            if (ObjectHasOwnProperty(blueDescriptors, key)) {
                // @ts-ignore PropertyDescriptorMap def defines properties
                // as being only of string type
                const originalDescriptor = getRedDescriptor(blueDescriptors[key]);
                installDescriptorIntoShadowTarget(shadowTarget, key, originalDescriptor);
            }
        }
    }

    function getBluePartialDescriptor(redPartialDesc: PropertyDescriptor): PropertyDescriptor {
        const bluePartialDesc = ObjectAssign(ObjectCreate(null), redPartialDesc);
        if ('writable' in bluePartialDesc) {
            // We are dealing with a value descriptor.
            bluePartialDesc.value = blueEnv.getBlueValue(bluePartialDesc.value);
        } else {
            // We are dealing with accessors.
            const { get, set } = bluePartialDesc;
            if (typeof get === 'function') {
                bluePartialDesc.get = blueEnv.getBlueValue(get);
            }
            if (typeof set === 'function') {
                bluePartialDesc.set = blueEnv.getBlueValue(set);
            }
        }
        return bluePartialDesc;
    }

    function getDistortedValue(target: RedProxyTarget): RedProxyTarget {
        if (!WeakMapHas(distortionMap, target)) {
            return target;
        }
        // if a distortion entry is found, it must be a valid proxy target
        return WeakMapGet(distortionMap, target) as RedProxyTarget;
    }

    function getRedDescriptor(blueDescriptor: PropertyDescriptor): PropertyDescriptor {
        const redDescriptor = ObjectAssign(ObjectCreate(null), blueDescriptor);
        if ('writable' in redDescriptor) {
            // We are dealing with a value descriptor.
            redDescriptor.value = getRedValue(redDescriptor.value);
        } else {
            // We are dealing with accessors.
            const { get, set } = redDescriptor;
            if (typeof get === 'function') {
                redDescriptor.get = getRedValue(get);
            }
            if (typeof set === 'function') {
                redDescriptor.set = getRedValue(set);
            }
        }
        return redDescriptor;
    }

    function getRedValue<T>(blue: T): T {
        if (blue === null) {
            return blue;
        }
        // NOTE: internationally checking for typeof 'undefined' for the case of
        // `typeof document.all === 'undefined'`, which is an exotic object with
        // a bizarre behavior described here:
        // * https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
        // This check covers that case, but doesn't affect other undefined values
        // because those are covered by the previous condition anyways.
        if (typeof blue === 'undefined') {
            // @ts-ignore blue at this point is type T because of the previous condition
            return undefined;
        }
        if (typeof blue === 'object' || typeof blue === 'function') {
            const blueOriginalOrDistortedValue = getDistortedValue(
                (blue as unknown) as BlueFunction | BlueObject | BlueArray
            );
            const red: RedValue | undefined = WeakMapGet(blueMap, blueOriginalOrDistortedValue);
            if (red !== undefined) {
                return red;
            }
            return (createRedProxy(blueOriginalOrDistortedValue) as unknown) as T;
        }
        return blue;
    }

    function getStaticBlueArray(redArray: RedArray): BlueArray {
        const { length } = redArray;
        const staticBlueArray = new ArrayCtor(length);
        for (let i = 0; i < length; i += 1) {
            if (i in redArray) {
                staticBlueArray[i] = blueEnv.getBlueValue(redArray[i]);
            }
        }
        return staticBlueArray;
    }

    function getTargetMeta(target: RedProxyTarget): TargetMeta {
        const meta: TargetMeta = ObjectCreate(null);
        meta.isBroken = false;
        meta.isExtensible = false;
        meta.isFrozen = false;
        meta.isSealed = false;
        meta.proto = null;
        try {
            // a revoked proxy will break the membrane when reading the meta
            meta.proto = ReflectGetPrototypeOf(target);
            meta.descriptors = ObjectGetOwnPropertyDescriptors(target);
            if (ObjectIsFrozen(target)) {
                // eslint-disable-next-line no-multi-assign
                meta.isFrozen = meta.isSealed = meta.isExtensible = true;
            } else if (ObjectIsSealed(target)) {
                // eslint-disable-next-line no-multi-assign
                meta.isSealed = meta.isExtensible = true;
            } else if (ReflectIsExtensible(target)) {
                meta.isExtensible = true;
            }
            // if the target was revoked or become revoked during the extraction
            // of the metadata, we mark it as broken in the catch.
            isArrayOrNotOrThrowForRevoked(target);
        } catch (_ignored) {
            // intentionally swallowing the error because this method is just
            // extracting the metadata in a way that it should always succeed
            // except for the cases in which the target is a proxy that is
            // either revoked or has some logic that is incompatible with the
            // membrane, in which case we will just create the proxy for the
            // membrane but revoke it right after to prevent any leakage.
            meta.proto = null;
            meta.descriptors = {};
            meta.isBroken = true;
        }
        return meta;
    }

    function installDescriptorIntoShadowTarget(
        shadowTarget: RedProxyTarget,
        key: PropertyKey,
        originalDescriptor: PropertyDescriptor
    ) {
        const shadowTargetDescriptor = ReflectGetOwnPropertyDescriptor(shadowTarget, key);
        if (shadowTargetDescriptor !== undefined) {
            if (
                ObjectHasOwnProperty(shadowTargetDescriptor, 'configurable') &&
                shadowTargetDescriptor.configurable === true
            ) {
                ReflectDefineProperty(shadowTarget, key, originalDescriptor);
            } else if (
                ObjectHasOwnProperty(shadowTargetDescriptor, 'writable') &&
                shadowTargetDescriptor.writable === true
            ) {
                // just in case
                shadowTarget[key] = originalDescriptor.value;
            } else {
                // ignoring... since it is non configurable and non-writable
                // usually, arguments, callee, etc.
            }
        } else {
            ReflectDefineProperty(shadowTarget, key, originalDescriptor);
        }
    }

    function isMarkAsDynamic(blue: RedProxyTarget): boolean {
        let hasDynamicMark: boolean = false;
        try {
            hasDynamicMark = ObjectHasOwnProperty(blue, LockerLiveValueMarkerSymbol);
        } catch {
            // try-catching this because blue could be a proxy that is revoked
            // or throws from the `has` trap.
        }
        return hasDynamicMark;
    }

    function lockShadowTarget(shadowTarget: RedShadowTarget, originalTarget: RedProxyTarget) {
        copyBlueDescriptorsIntoShadowTarget(shadowTarget, originalTarget);
        // setting up __proto__ of the shadowTarget
        ReflectSetPrototypeOf(shadowTarget, getRedValue(ReflectGetPrototypeOf(originalTarget)));
        // locking down the extensibility of shadowTarget
        ReflectPreventExtensions(shadowTarget);
    }

    function renameFunction(
        blueProvider: (...args: any[]) => any,
        receiver: (...args: any[]) => any
    ) {
        try {
            // a revoked proxy will break the membrane when reading the function name
            const nameDescriptor = ReflectGetOwnPropertyDescriptor(blueProvider, 'name')!;
            ReflectDefineProperty(receiver, 'name', nameDescriptor);
        } catch {
            // intentionally swallowing the error because this method is just extracting the
            // function in a way that it should always succeed except for the cases in which
            // the provider is a proxy that is either revoked or has some logic to prevent
            // reading the name property descriptor.
        }
    }

    // invoking traps

    function redProxyApplyTrap(
        this: RedProxyHandler,
        shadowTarget: RedShadowTarget,
        redThisArg: RedValue,
        redArgArray: RedValue[]
    ): RedValue {
        const { target: blueTarget } = this;
        let blue;
        try {
            const blueThisArg = blueEnv.getBlueValue(redThisArg);
            const blueArgArray = getStaticBlueArray(redArgArray);
            blue = blueApplyHook(blueTarget as BlueFunction, blueThisArg, blueArgArray);
        } catch (e) {
            // This error occurred when the sandbox attempts to call a
            // function from the blue realm. By throwing a new red error,
            // we eliminates the stack information from the blue realm as a consequence.
            throw getRedValue(e);
        }
        return getRedValue(blue);
    }

    function redProxyConstructTrap(
        this: RedProxyHandler,
        shadowTarget: RedShadowTarget,
        redArgArray: RedValue[],
        redNewTarget: RedObject
    ): RedValue {
        const { target: BlueCtor } = this;
        if (redNewTarget === undefined) {
            throw new TypeErrorCtor();
        }
        let blue;
        try {
            const blueNewTarget = blueEnv.getBlueValue(redNewTarget);
            const blueArgArray = getStaticBlueArray(redArgArray);
            blue = blueConstructHook(BlueCtor as BlueConstructor, blueArgArray, blueNewTarget);
        } catch (e) {
            // This error occurred when the sandbox attempts to new a
            // constructor from the blue realm. By throwing a new red error,
            // we eliminates the stack information from the blue realm as a consequence.
            throw getRedValue(e);
        }
        return getRedValue(blue);
    }

    // reading traps

    /**
     * This trap cannot just use `Reflect.get` directly on the `target` because
     * the red object graph might have mutations that are only visible on the red side,
     * which means looking into `target` directly is not viable. Instead, we need to
     * implement a more crafty solution that looks into target's own properties, or
     * in the red proto chain when needed.
     */
    function redProxyDynamicGetTrap(
        this: RedProxyHandler,
        shadowTarget: RedShadowTarget,
        key: PropertyKey,
        receiver: RedObject
    ): RedValue {
        /**
         * If the target has a non-configurable own data descriptor that was observed
         * by the red side, and therefore installed in the shadowTarget, we might get
         * into a situation where a writable, non-configurable value in the target is
         * out of sync with the shadowTarget's value for the same key. This is fine
         * because this does not violate the object invariants, and even though they
         * are out of sync, the original descriptor can only change to something that
         * is compatible with what was installed in shadowTarget, and in order to
         * observe that, the getOwnPropertyDescriptor trap must be used, which will
         * take care of synchronizing them again.
         */
        const { target } = this;
        if (!ObjectHasOwnProperty(target, key)) {
            // looking in the red proto chain in case the red proto chain has being mutated
            const proto = ReflectGetPrototypeOf(target);
            if (proto === null) {
                return undefined;
            }
            const redProto = getRedValue(proto);
            return ReflectGet(redProto, key, receiver);
        }
        const blueGetter = ObjectLookupGetter(target, key);
        if (blueGetter) {
            // Knowing that it is an own getter, we can't still not use Reflect.get
            // because there might be a distortion for such getter, in which case we
            // must get the red getter, and call it.
            return ReflectApply(getRedValue(blueGetter), receiver, emptyArray);
        }
        // if it is not an accessor property, is either a setter only accessor
        // or a data property, in which case we could return undefined or the red value
        return getRedValue(target[key]);
    }

    /**
     * This trap cannot just use `Reflect.has` or the `in` operator directly because
     * the red object graph might have mutations that are only visible on the red side,
     * which means looking into `target` directly is not viable. Instead, we need to
     * implement a more crafty solution that looks into target's own properties, or
     * in the red proto chain when needed.
     */
    function redProxyDynamicHasTrap(
        this: RedProxyHandler,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        shadowTarget: RedShadowTarget,
        key: PropertyKey
    ): boolean {
        const { target } = this;
        if (ObjectHasOwnProperty(target, key)) {
            return true;
        }
        // looking in the red proto chain in case the red proto chain has being mutated
        const proto = ReflectGetPrototypeOf(target);
        if (proto === null) {
            return false;
        }
        const redProto = getRedValue(proto);
        return ReflectHas(redProto, key);
    }

    function redProxyDynamicOwnKeysTrap(
        this: RedProxyHandler,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        shadowTarget: RedShadowTarget
    ): PropertyKey[] {
        return ReflectOwnKeys(this.target);
    }

    function redProxyDynamicIsExtensibleTrap(
        this: RedProxyHandler,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        shadowTarget: RedShadowTarget
    ): boolean {
        // optimization to avoid attempting to lock down the shadowTarget multiple times
        if (!ReflectIsExtensible(shadowTarget)) {
            return false; // was already locked down
        }
        const { target } = this;
        if (!ReflectIsExtensible(target)) {
            lockShadowTarget(shadowTarget, target);
            return false;
        }
        return true;
    }

    function redProxyDynamicGetOwnPropertyDescriptorTrap(
        this: RedProxyHandler,
        shadowTarget: RedShadowTarget,
        key: PropertyKey
    ): PropertyDescriptor | undefined {
        const { target } = this;
        const normalizedBlueDescriptor = ReflectGetOwnPropertyDescriptor(target, key);
        if (normalizedBlueDescriptor === undefined) {
            return normalizedBlueDescriptor;
        }
        if (normalizedBlueDescriptor.configurable === false) {
            // updating the descriptor to non-configurable on the shadow
            copyBlueDescriptorIntoShadowTarget(shadowTarget, normalizedBlueDescriptor, key);
        }
        return getRedDescriptor(normalizedBlueDescriptor);
    }

    function redProxyDynamicGetPrototypeOfTrap(
        this: RedProxyHandler,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        shadowTarget: RedShadowTarget
    ): RedValue {
        return getRedValue(ReflectGetPrototypeOf(this.target));
    }

    // writing traps

    function redProxyDynamicSetPrototypeOfTrap(
        this: RedProxyHandler,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        shadowTarget: RedShadowTarget,
        prototype: RedValue
    ): boolean {
        return ReflectSetPrototypeOf(this.target, blueEnv.getBlueValue(prototype));
    }

    /**
     * This trap cannot just use `Reflect.set` directly on the `target` because
     * the red object graph might have mutations that are only visible on the red side,
     * which means looking into `target` directly is not viable. Instead, we need to
     * implement a more crafty solution that looks into target's own properties, or
     * in the red proto chain when needed.
     */
    function redProxyDynamicSetTrap(
        this: RedProxyHandler,
        shadowTarget: RedShadowTarget,
        key: PropertyKey,
        value: RedValue,
        receiver: RedObject
    ): boolean {
        const { target } = this;
        if (!ObjectHasOwnProperty(target, key)) {
            // looking in the red proto chain in case the red proto chain has being mutated
            const redProto = getRedValue(ReflectGetPrototypeOf(target));
            return redProto !== null && ReflectSet(redProto, key, value, receiver);
        }
        const blueSetter = ObjectLookupSetter(target, key);
        if (blueSetter) {
            // even though the setter function exists, we can't use Reflect.set because
            // there might be a distortion for that setter function, in which case we
            // must resolve the red setter and call it instead.
            ReflectApply(getRedValue(blueSetter), receiver, [value]);
            // if there is a callable setter, it either throw or we can assume the
            // value was set
            return true;
        }
        // if it is not an accessor property, is either a getter only accessor
        // or a data property, in which case we use Reflect.set to set the value,
        // and no receiver is needed since it will simply set the data property or nothing
        return ReflectSet(target, key, blueEnv.getBlueValue(value));
    }

    function redProxyDynamicDeletePropertyTrap(
        this: RedProxyHandler,
        shadowTarget: RedShadowTarget,
        key: PropertyKey
    ): boolean {
        return ReflectDeleteProperty(this.target, key);
    }

    function redProxyDynamicPreventExtensionsTrap(
        this: RedProxyHandler,
        shadowTarget: RedShadowTarget
    ): boolean {
        const { target } = this;
        if (ReflectIsExtensible(shadowTarget)) {
            if (!ReflectPreventExtensions(target)) {
                // if the target is a proxy manually created in the sandbox, it might reject
                // the preventExtension call, in which case we should not attempt to lock down
                // the shadow target.
                if (!ReflectIsExtensible(target)) {
                    lockShadowTarget(shadowTarget, target);
                }
                return false;
            }
            lockShadowTarget(shadowTarget, target);
        }
        return true;
    }

    function redProxyDynamicDefinePropertyTrap(
        this: RedProxyHandler,
        shadowTarget: RedShadowTarget,
        key: PropertyKey,
        redPartialDesc: PropertyDescriptor
    ): boolean {
        const { target } = this;
        const bluePartialDesc = getBluePartialDescriptor(redPartialDesc);
        if (ReflectDefineProperty(target, key, bluePartialDesc)) {
            // intentionally testing against true since it could be undefined as well
            if (bluePartialDesc.configurable === false) {
                const blueDescriptor = ReflectGetOwnPropertyDescriptor(target, key);
                copyBlueDescriptorIntoShadowTarget(shadowTarget, blueDescriptor, key);
            }
        }
        return true;
    }

    // pending traps

    function redProxyPendingSetPrototypeOfTrap(
        this: RedProxyHandler,
        shadowTarget: RedShadowTarget,
        prototype: RedValue
    ): boolean {
        makeRedProxyUnambiguous(this, shadowTarget);
        return this.setPrototypeOf(shadowTarget, prototype);
    }

    function redProxyPendingSetTrap(
        this: RedProxyHandler,
        shadowTarget: RedShadowTarget,
        key: PropertyKey,
        value: RedValue,
        receiver: RedObject
    ): boolean {
        makeRedProxyUnambiguous(this, shadowTarget);
        return this.set(shadowTarget, key, value, receiver);
    }

    function redProxyPendingDeletePropertyTrap(
        this: RedProxyHandler,
        shadowTarget: RedShadowTarget,
        key: PropertyKey
    ): boolean {
        makeRedProxyUnambiguous(this, shadowTarget);
        return this.deleteProperty(shadowTarget, key);
    }

    function redProxyPendingPreventExtensionsTrap(
        this: RedProxyHandler,
        shadowTarget: RedShadowTarget
    ): boolean {
        makeRedProxyUnambiguous(this, shadowTarget);
        return this.preventExtensions(shadowTarget);
    }

    function redProxyPendingDefinePropertyTrap(
        this: RedProxyHandler,
        shadowTarget: RedShadowTarget,
        key: PropertyKey,
        redPartialDesc: PropertyDescriptor
    ): boolean {
        makeRedProxyUnambiguous(this, shadowTarget);
        return this.defineProperty(shadowTarget, key, redPartialDesc);
    }

    function makeRedProxyDynamic(
        proxyHandler: RedProxyHandler,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        shadowTarget: RedShadowTarget
    ) {
        // replacing pending traps with dynamic traps that can work with the target
        // without taking snapshots.
        proxyHandler.set = redProxyDynamicSetTrap;
        proxyHandler.deleteProperty = redProxyDynamicDeletePropertyTrap;
        proxyHandler.setPrototypeOf = redProxyDynamicSetPrototypeOfTrap;
        proxyHandler.preventExtensions = redProxyDynamicPreventExtensionsTrap;
        proxyHandler.defineProperty = redProxyDynamicDefinePropertyTrap;
    }

    function makeRedProxyStatic(proxyHandler: RedProxyHandler, shadowTarget: RedShadowTarget) {
        const meta = getTargetMeta(proxyHandler.target);
        const { proto: blueProto, isBroken } = meta;
        if (isBroken) {
            // the target is a revoked proxy, in which case we revoke
            // this proxy as well.
            proxyHandler.revoke();
        }
        // adjusting the proto chain of the shadowTarget
        const redProto = getRedValue(blueProto);
        ReflectSetPrototypeOf(shadowTarget, redProto);
        // defining own descriptors
        copyRedOwnDescriptors(shadowTarget, meta.descriptors);
        // preserving the semantics of the object
        if (meta.isFrozen) {
            ObjectFreeze(shadowTarget);
        } else if (meta.isSealed) {
            ObjectSeal(shadowTarget);
        } else if (!meta.isExtensible) {
            ReflectPreventExtensions(shadowTarget);
        }
        // resetting all traps except apply and construct for static proxies since the
        // proxy target is the shadow target and all operations are going to be applied
        // to it rather than the real target.
        // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-0.html#operands-for-delete-must-be-optional
        const anyProxyHandle = proxyHandler as any; // TODO: bypass error TS2790, is this good way?
        delete anyProxyHandle.getOwnPropertyDescriptor;
        delete anyProxyHandle.getPrototypeOf;
        delete anyProxyHandle.get;
        delete anyProxyHandle.has;
        delete anyProxyHandle.ownKeys;
        delete anyProxyHandle.isExtensible;
        // those used by pending traps needs to exist so the pending trap can call them
        proxyHandler.set = ReflectSet;
        proxyHandler.defineProperty = ReflectDefineProperty;
        proxyHandler.deleteProperty = ReflectDeleteProperty;
        proxyHandler.setPrototypeOf = ReflectSetPrototypeOf;
        proxyHandler.preventExtensions = ReflectPreventExtensions;
        // future optimization: hoping that proxies with frozen handlers can be faster
        ObjectFreeze(proxyHandler);
    }

    function makeRedProxyUnambiguous(proxyHandler: RedProxyHandler, shadowTarget: RedShadowTarget) {
        if (isMarkAsDynamic(proxyHandler.target)) {
            // when the target has the a descriptor for the magic symbol, use the Dynamic traps
            makeRedProxyDynamic(proxyHandler, shadowTarget);
        } else {
            makeRedProxyStatic(proxyHandler, shadowTarget);
        }
        // future optimization: hoping that proxies with frozen handlers can be faster
        ObjectFreeze(proxyHandler);
    }

    /**
     * RedProxyHandler class is used for any object, array or function coming from
     * the blue realm. The semantics of this proxy handler are the following:
     *  - the proxy is live (dynamic) after creation
     *  = once the first mutation trap is called, the handler will be make unambiguous
     *  - if the target has the magical symbol the proxy will remain as dynamic forever.
     *  = otherwise proxy will become static by taking a snapshot of the target
     */
    class RedProxyHandler implements ProxyHandler<RedProxyTarget>, ProxyHandler<RedShadowTarget> {
        // original target for the proxy
        readonly target: RedProxyTarget;

        apply = redProxyApplyTrap;

        construct = redProxyConstructTrap;

        get = redProxyDynamicGetTrap;

        has = redProxyDynamicHasTrap;

        ownKeys = redProxyDynamicOwnKeysTrap;

        isExtensible = redProxyDynamicIsExtensibleTrap;

        getOwnPropertyDescriptor = redProxyDynamicGetOwnPropertyDescriptorTrap;

        getPrototypeOf = redProxyDynamicGetPrototypeOfTrap;

        setPrototypeOf = redProxyPendingSetPrototypeOfTrap;

        set = redProxyPendingSetTrap;

        deleteProperty = redProxyPendingDeletePropertyTrap;

        preventExtensions = redProxyPendingPreventExtensionsTrap;

        defineProperty = redProxyPendingDefinePropertyTrap;

        // revoke is meant to be set right after construction, but
        // typescript is forcing the initialization :(
        revoke: () => void = noop;

        constructor(blue: RedProxyTarget) {
            this.target = blue;
        }
    }
    ReflectSetPrototypeOf(RedProxyHandler.prototype, null);

    function createRedShadowTarget(blue: RedProxyTarget): RedShadowTarget {
        let shadowTarget;
        if (typeof blue === 'function') {
            // this is never invoked just needed to anchor the realm for errors
            try {
                // eslint-disable-next-line func-names
                shadowTarget = 'prototype' in blue ? function () {} : () => {};
            } catch {
                // target is either a revoked proxy, or a proxy that throws on the
                // `has` trap, in which case going with a strict mode function seems
                // appropriate.
                // eslint-disable-next-line func-names
                shadowTarget = function () {};
            }
            renameFunction(blue as (...args: any[]) => any, shadowTarget);
        } else {
            let isBlueArray = false;
            try {
                // try/catch in case Array.isArray throws when target is a revoked proxy
                isBlueArray = isArrayOrNotOrThrowForRevoked(blue);
            } catch {
                // target is a revoked proxy, ignoring...
            }
            // target is array or object
            shadowTarget = isBlueArray ? [] : {};
        }
        return shadowTarget;
    }

    function createRedProxy(blueOriginalOrDistortedValue: RedProxyTarget): RedProxy {
        const shadowTarget = createRedShadowTarget(blueOriginalOrDistortedValue);
        const proxyHandler = new RedProxyHandler(blueOriginalOrDistortedValue);
        const { proxy, revoke } = ProxyRevocable(shadowTarget, proxyHandler);
        proxyHandler.revoke = revoke;
        try {
            // intentionally storing the distorted blue object, this way, if a distortion
            // exists, and the sandbox passed back its reference to blue, it gets mapped
            // to the distortion rather than the original. This protects against tricking
            // the blue side to use the original value (unwrapping the provided proxy ref)
            // while the blue side will mistakenly evaluate the original function.
            blueEnv.setRefMapEntries(proxy, blueOriginalOrDistortedValue);
        } catch (e) {
            // This is a very edge case, it could happen if someone is very
            // crafty, but basically can cause an overflow when invoking the
            // setRefMapEntries() method, which will report an error from
            // the blue realm.
            throw new ErrorCtor('Internal Error');
        }
        try {
            isArrayOrNotOrThrowForRevoked(blueOriginalOrDistortedValue);
        } catch {
            // detecting revoked targets, it can also be detected later on
            // during mutations, in which case we will also revoke
            revoke();
        }
        return proxy;
    }

    return getRedValue;
}).toString()
    // We cannot have 'use strict' directly in `redEnvFactory()` because bundlers and
    // minifiers may strip the directive. So, we inject 'use strict' after the function
    // is coerced to a string.
    .replace('{', `{'use strict';`);
