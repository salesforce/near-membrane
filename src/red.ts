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
    RedProxyTarget,
    RedValue,
    RedObject,
    RedShadowTarget,
    RedFunction,
    RedArray,
    RedProxy,
    BlueConstructor,
    BlueFunction,
    BlueValue,
    BlueArray,
    TargetMeta,
    MembraneBroker,
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
    apply(target: BlueFunction, thisArgument: BlueValue, argumentsList: ArrayLike<BlueValue>): BlueValue;
    construct(target: BlueConstructor, argumentsList: ArrayLike<BlueValue>, newTarget?: any): BlueValue;
}

export const serializedRedEnvSourceText = (function redEnvFactory(blueEnv: MembraneBroker, hooks: MarshalHooks) {
    'use strict';

    const LockerLiveValueMarkerSymbol = Symbol.for('@@lockerLiveValue');
    const { blueMap, distortionMap } = blueEnv;
    const { apply: blueApplyHook, construct: blueConstructHook } = hooks;

    const {
        apply,
        construct,
        isExtensible,
        getOwnPropertyDescriptor,
        setPrototypeOf,
        getPrototypeOf,
        preventExtensions,
        deleteProperty,
        ownKeys,
        defineProperty,
        get: ReflectGet,
        set: ReflectSet,
        has: ReflectHas,
    } = Reflect;
    const {
        assign,
        create,
        getOwnPropertyDescriptors,
        freeze,
        seal,
        isSealed,
        isFrozen,
        hasOwnProperty,
    } = Object;
    const ProxyRevocable = Proxy.revocable;
    const { isArray: isArrayOrNotOrThrowForRevoked } = Array;
    const noop = () => undefined;
    const emptyArray: [] = [];
    const map = unapply(Array.prototype.map);
    const WeakMapGet = unapply(WeakMap.prototype.get);
    const WeakMapHas = unapply(WeakMap.prototype.has);
    const ErrorCreate = unconstruct(Error);
    const hasOwnPropertyCall = unapply(hasOwnProperty);

    function unapply(func: Function): Function {
        return (thisArg: any, ...args: any[]) => apply(func, thisArg, args);
    }

    function unconstruct(func: Function): Function {
        return (...args: any[]) => construct(func, args);
    }

    function isUndefined(obj: any): obj is undefined {
        return obj === undefined;
    }

    function isNull(obj: any): obj is null {
        return obj === null;
    }

    function isFunction(obj: any): obj is Function {
        return typeof obj === 'function';
    }

    function isNullOrUndefined(obj: any): obj is (null | undefined) {
        return isNull(obj) || isUndefined(obj);
    }

    function isMarkAsDynamic(blue: RedProxyTarget): boolean {
        let hasDynamicMark: boolean = false;
        try {
            hasDynamicMark = hasOwnPropertyCall(blue, LockerLiveValueMarkerSymbol);
        } catch {
            // try-catching this because blue could be a proxy that is revoked
            // or throws from the `has` trap.
        }
        return hasDynamicMark;
    }

    function getRedValue(blue: BlueValue): RedValue {
        if (isNullOrUndefined(blue)) {
            return blue as RedValue;
        }
        // NOTE: internationally checking for typeof 'undefined' for the case of
        // `typeof document.all === 'undefined'`, which is an exotic object with
        // a bizarre behavior described here:
        // * https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
        // This check covers that case, but doesn't affect other undefined values
        // because those are covered by the previous condition anyways.
        if (typeof blue === 'undefined') {
            return undefined;
        }
        if (typeof blue === 'object' || typeof blue === 'function') {
            const blueOriginalOrDistortedValue = getDistortedValue(blue);
            const red: RedValue | undefined = WeakMapGet(blueMap, blueOriginalOrDistortedValue);
            if (!isUndefined(red)) {
                return red;
            }
            return createRedProxy(blueOriginalOrDistortedValue);
        }
        return blue as RedValue;
    }

    function getStaticBlueArray(redArray: RedArray): BlueArray {
        return map(redArray, blueEnv.getBlueValue);
    }

    function getDistortedValue(target: RedProxyTarget): RedProxyTarget {
        if (!WeakMapHas(distortionMap, target)) {
            return target;
        }
        // if a distortion entry is found, it must be a valid proxy target
        const distortedTarget = WeakMapGet(distortionMap, target) as RedProxyTarget;
        return distortedTarget;
    }

    function renameFunction(blueProvider: (...args: any[]) => any, receiver: (...args: any[]) => any) {
        try {
            // a revoked proxy will break the membrane when reading the function name
            const nameDescriptor = getOwnPropertyDescriptor(blueProvider, 'name')!;
            defineProperty(receiver, 'name', nameDescriptor);
        } catch {
            // intentionally swallowing the error because this method is just extracting the function
            // in a way that it should always succeed except for the cases in which the provider is a proxy
            // that is either revoked or has some logic to prevent reading the name property descriptor.
        }
    }    

    function installDescriptorIntoShadowTarget(shadowTarget: RedProxyTarget, key: PropertyKey, originalDescriptor: PropertyDescriptor) {
        const shadowTargetDescriptor = getOwnPropertyDescriptor(shadowTarget, key);
        if (!isUndefined(shadowTargetDescriptor)) {
            if (hasOwnPropertyCall(shadowTargetDescriptor, 'configurable') &&
                    shadowTargetDescriptor.configurable === true) {
                defineProperty(shadowTarget, key, originalDescriptor);
            } else if (hasOwnPropertyCall(shadowTargetDescriptor, 'writable') &&
                    shadowTargetDescriptor.writable === true) {
                // just in case
                shadowTarget[key] = originalDescriptor.value;
            } else {
                // ignoring... since it is non configurable and non-writable
                // usually, arguments, callee, etc.
            }
        } else {
            defineProperty(shadowTarget, key, originalDescriptor);
        }
    }

    function getRedDescriptor(blueDescriptor: PropertyDescriptor): PropertyDescriptor {
        const redDescriptor = assign(create(null), blueDescriptor);
        const { value: blueValue, get: blueGet, set: blueSet } = redDescriptor;
        if ('writable' in redDescriptor) {
            // we are dealing with a value descriptor
            redDescriptor.value = getRedValue(blueValue);
        } else {
            // we are dealing with accessors
            if (isFunction(blueSet)) {
                redDescriptor.set = getRedValue(blueSet);
            }
            if (isFunction(blueGet)) {
                redDescriptor.get = getRedValue(blueGet);
            }
        }
        return redDescriptor;
    }

    function copyRedOwnDescriptors(shadowTarget: RedShadowTarget, blueDescriptors: PropertyDescriptorMap) {
        for (const key in blueDescriptors) {
            // avoid poisoning by checking own properties from descriptors
            if (hasOwnPropertyCall(blueDescriptors, key)) {
                const originalDescriptor = getRedDescriptor(blueDescriptors[key]);
                installDescriptorIntoShadowTarget(shadowTarget, key, originalDescriptor);
            }
        }
    }

    function copyBlueDescriptorIntoShadowTarget(shadowTarget: RedShadowTarget, originalTarget: RedProxyTarget, key: PropertyKey) {
        // Note: a property might get defined multiple times in the shadowTarget
        //       if the user calls defineProperty or similar mechanism multiple times
        //       but it will always be compatible with the previous descriptor
        //       to preserve the object invariants, which makes these lines safe.
        const normalizedBlueDescriptor = getOwnPropertyDescriptor(originalTarget, key);
        if (!isUndefined(normalizedBlueDescriptor)) {
            const redDesc = getRedDescriptor(normalizedBlueDescriptor);
            defineProperty(shadowTarget, key, redDesc);
        }
    }

    function lockShadowTarget(shadowTarget: RedShadowTarget, originalTarget: RedProxyTarget) {
        const targetKeys = ownKeys(originalTarget);
        for (let i = 0, len = targetKeys.length; i < len; i += 1) {
            copyBlueDescriptorIntoShadowTarget(shadowTarget, originalTarget, targetKeys[i]);
        }
        preventExtensions(shadowTarget);
    }

    function getTargetMeta(target: RedProxyTarget): TargetMeta {
        const meta: TargetMeta = create(null);
        try {
            // a revoked proxy will break the membrane when reading the meta
            meta.proto = getPrototypeOf(target);
            meta.descriptors = getOwnPropertyDescriptors(target);
            if (isFrozen(target)) {
                meta.isFrozen = meta.isSealed = meta.isExtensible = true;
            } else if (isSealed(target)) {
                meta.isSealed = meta.isExtensible = true;
            } else if (isExtensible(target)) {
                meta.isExtensible = true;
            }
            // if the target was revoked or become revoked during the extraction
            // of the metadata, we mark it as broken in the catch.
            isArrayOrNotOrThrowForRevoked(target);
        } catch (_ignored) {
            // intentionally swallowing the error because this method is just extracting the metadata
            // in a way that it should always succeed except for the cases in which the target is a proxy
            // that is either revoked or has some logic that is incompatible with the membrane, in which
            // case we will just create the proxy for the membrane but revoke it right after to prevent
            // any leakage.
            meta.proto = null;
            meta.descriptors = {};
            meta.isBroken = true;
        }
        return meta;
    }

    function getBluePartialDescriptor(redPartialDesc: PropertyDescriptor): PropertyDescriptor {
        const bluePartialDesc = assign(create(null), redPartialDesc);
        if ('value' in bluePartialDesc) {
            // we are dealing with a value descriptor
            bluePartialDesc.value = blueEnv.getBlueValue(bluePartialDesc.value);
        }
        if ('set' in bluePartialDesc) {
            // we are dealing with accessors
            bluePartialDesc.set = blueEnv.getBlueValue(bluePartialDesc.set);
        }
        if ('get' in bluePartialDesc) {
            bluePartialDesc.get = blueEnv.getBlueValue(bluePartialDesc.get);
        }
        return bluePartialDesc;
    }

    // invoking traps

    function redProxyApplyTrap(this: RedProxyHandler, shadowTarget: RedShadowTarget, redThisArg: RedValue, redArgArray: RedValue[]): RedValue {
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
            let redError;
            const { message, constructor } = e;
            try {
                // the error constructor must be a blue error since it occur when calling
                // a function from the blue realm.
                const redErrorConstructor = blueEnv.getRedRef(constructor);
                // the red constructor must be registered (done during construction of env)
                // otherwise we need to fallback to a regular error.
                redError = construct(redErrorConstructor as RedFunction, [message]);
            } catch {
                // in case the constructor inference fails
                redError = new Error(message);
            }
            throw redError;
        }
        return getRedValue(blue);
    }

    function redProxyConstructTrap(this: RedProxyHandler, shadowTarget: RedShadowTarget, redArgArray: RedValue[], redNewTarget: RedObject): RedObject {
        const { target: BlueCtor } = this;
        if (isUndefined(redNewTarget)) {
            throw TypeError();
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
            let redError;
            const { message, constructor } = e;
            try {
                // the error constructor must be a blue error since it occur when calling
                // a function from the blue realm.
                const redErrorConstructor = blueEnv.getRedRef(constructor);
                // the red constructor must be registered (done during construction of env)
                // otherwise we need to fallback to a regular error.
                redError = construct(redErrorConstructor as RedFunction, [message]);
            } catch {
                // in case the constructor inference fails
                redError = new Error(message);
            }
            throw redError;
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
    function redProxyDynamicGetTrap(this: RedProxyHandler, shadowTarget: RedShadowTarget, key: PropertyKey, receiver: RedObject): RedValue {
        /**
         * If the target has a non-configurable own data descriptor that was observed by the red side,
         * and therefore installed in the shadowTarget, we might get into a situation where a writable,
         * non-configurable value in the target is out of sync with the shadowTarget's value for the same
         * key. This is fine because this does not violate the object invariants, and even though they
         * are out of sync, the original descriptor can only change to something that is compatible with
         * what was installed in shadowTarget, and in order to observe that, the getOwnPropertyDescriptor
         * trap must be used, which will take care of synchronizing them again.
         */
        const { target } = this;
        const blueDescriptor = getOwnPropertyDescriptor(target, key);
        if (isUndefined(blueDescriptor)) {
            // looking in the red proto chain in case the red proto chain has being mutated
            const redProto = getRedValue(getPrototypeOf(target));
            // some objects may have a null prototype so return undefined
            if (isNull(redProto)) {
                return undefined;
            }
            return ReflectGet(redProto, key, receiver);
        }
        if (hasOwnPropertyCall(blueDescriptor, 'get')) {
            // Knowing that it is an own getter, we can't still not use Reflect.get
            // because there might be a distortion for such getter, in which case we
            // must get the red getter, and call it.
            return apply(getRedValue(blueDescriptor.get), receiver, emptyArray);
        }
        // if it is not an accessor property, is either a setter only accessor
        // or a data property, in which case we could return undefined or the red value
        return getRedValue(blueDescriptor.value);
    }

    /**
     * This trap cannot just use `Reflect.has` or the `in` operator directly because
     * the red object graph might have mutations that are only visible on the red side,
     * which means looking into `target` directly is not viable. Instead, we need to
     * implement a more crafty solution that looks into target's own properties, or
     * in the red proto chain when needed.
     */
    function redProxyDynamicHasTrap(this: RedProxyHandler, shadowTarget: RedShadowTarget, key: PropertyKey): boolean {
        const { target } = this;
        if (hasOwnPropertyCall(target, key)) {
            return true;
        }
        // looking in the red proto chain in case the red proto chain has being mutated
        const redProto = getRedValue(getPrototypeOf(target));
        return ReflectHas(redProto, key);
    }

    function redProxyDynamicOwnKeysTrap(this: RedProxyHandler, shadowTarget: RedShadowTarget): PropertyKey[] {
        return ownKeys(this.target);
    }

    function redProxyDynamicIsExtensibleTrap(this: RedProxyHandler, shadowTarget: RedShadowTarget): boolean {
        // optimization to avoid attempting to lock down the shadowTarget multiple times
        if (!isExtensible(shadowTarget)) {
            return false; // was already locked down
        }
        const { target } = this;
        if (!isExtensible(target)) {
            lockShadowTarget(shadowTarget, target);
            return false;
        }
        return true;
    }

    function redProxyDynamicGetOwnPropertyDescriptorTrap(this: RedProxyHandler, shadowTarget: RedShadowTarget, key: PropertyKey): PropertyDescriptor | undefined {
        const { target } = this;
        const blueDesc = getOwnPropertyDescriptor(target, key);
        if (isUndefined(blueDesc)) {
            return blueDesc;
        }
        if (blueDesc.configurable === false) {
            // updating the descriptor to non-configurable on the shadow
            copyBlueDescriptorIntoShadowTarget(shadowTarget, target, key);
        }
        return getRedDescriptor(blueDesc);
    }

    function redProxyDynamicGetPrototypeOfTrap(this: RedProxyHandler, shadowTarget: RedShadowTarget): RedValue {
        return getRedValue(getPrototypeOf(this.target));
    }

    // writing traps

    function redProxyDynamicSetPrototypeOfTrap(this: RedProxyHandler, shadowTarget: RedShadowTarget, prototype: RedValue): boolean {
        return setPrototypeOf(this.target, blueEnv.getBlueValue(prototype));
    }

    /**
     * This trap cannot just use `Reflect.set` directly on the `target` because
     * the red object graph might have mutations that are only visible on the red side,
     * which means looking into `target` directly is not viable. Instead, we need to
     * implement a more crafty solution that looks into target's own properties, or
     * in the red proto chain when needed.
     */
    function redProxyDynamicSetTrap(this: RedProxyHandler, shadowTarget: RedShadowTarget, key: PropertyKey, value: RedValue, receiver: RedObject): boolean {
        const { target } = this;
        const blueDescriptor = getOwnPropertyDescriptor(target, key);
        if (isUndefined(blueDescriptor)) {
            // looking in the red proto chain in case the red proto chain has being mutated
            const redProto = getRedValue(getPrototypeOf(target));
            return ReflectSet(redProto, key, value, receiver);
        }
        if (hasOwnPropertyCall(blueDescriptor, 'set')) {
            // even though the setter function exists, we can't use Reflect.set because there might be
            // a distortion for that setter function, in which case we must resolve the red setter
            // and call it instead.
            apply(getRedValue(blueDescriptor.set), receiver, [value]);
            return true; // if there is a callable setter, it either throw or we can assume the value was set
        }
        // if it is not an accessor property, is either a getter only accessor
        // or a data property, in which case we use Reflect.set to set the value,
        // and no receiver is needed since it will simply set the data property or nothing
        return ReflectSet(target, key, blueEnv.getBlueValue(value));
    }

    function redProxyDynamicDeletePropertyTrap(this: RedProxyHandler, shadowTarget: RedShadowTarget, key: PropertyKey): boolean {
        return deleteProperty(this.target, key);
    }

    function redProxyDynamicPreventExtensionsTrap(this: RedProxyHandler, shadowTarget: RedShadowTarget): boolean {
        const { target } = this;
        if (isExtensible(shadowTarget)) {
            if (!preventExtensions(target)) {
                // if the target is a proxy manually created in the sandbox, it might reject
                // the preventExtension call, in which case we should not attempt to lock down
                // the shadow target.
                if (!isExtensible(target)) {
                    lockShadowTarget(shadowTarget, target);
                }
                return false;
            }
            lockShadowTarget(shadowTarget, target);
        }
        return true;
    }

    function redProxyDynamicDefinePropertyTrap(this: RedProxyHandler, shadowTarget: RedShadowTarget, key: PropertyKey, redPartialDesc: PropertyDescriptor): boolean {
        const { target } = this;
        const blueDesc = getBluePartialDescriptor(redPartialDesc);
        if (defineProperty(target, key, blueDesc)) {
            // intentionally testing against true since it could be undefined as well
            if (blueDesc.configurable === false) {
                copyBlueDescriptorIntoShadowTarget(shadowTarget, target, key);
            }
        }
        return true;
    }

    // pending traps

    function redProxyPendingSetPrototypeOfTrap(this: RedProxyHandler, shadowTarget: RedShadowTarget, prototype: RedValue): boolean {
        makeRedProxyUnambiguous(this, shadowTarget);
        return this.setPrototypeOf(shadowTarget, prototype);
    }

    function redProxyPendingSetTrap(this: RedProxyHandler, shadowTarget: RedShadowTarget, key: PropertyKey, value: RedValue, receiver: RedObject): boolean {
        makeRedProxyUnambiguous(this, shadowTarget);
        return this.set(shadowTarget, key, value, receiver);
    }

    function redProxyPendingDeletePropertyTrap(this: RedProxyHandler, shadowTarget: RedShadowTarget, key: PropertyKey): boolean {
        makeRedProxyUnambiguous(this, shadowTarget);
        return this.deleteProperty(shadowTarget, key);
    }

    function redProxyPendingPreventExtensionsTrap(this: RedProxyHandler, shadowTarget: RedShadowTarget): boolean {
        makeRedProxyUnambiguous(this, shadowTarget);
        return this.preventExtensions(shadowTarget);
    }

    function redProxyPendingDefinePropertyTrap(this: RedProxyHandler, shadowTarget: RedShadowTarget, key: PropertyKey, redPartialDesc: PropertyDescriptor): boolean {
        makeRedProxyUnambiguous(this, shadowTarget);
        return this.defineProperty(shadowTarget, key, redPartialDesc);
    }

    function makeRedProxyDynamic(proxyHandler: RedProxyHandler, shadowTarget: RedShadowTarget) {
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
        setPrototypeOf(shadowTarget, redProto);
        // defining own descriptors
        copyRedOwnDescriptors(shadowTarget, meta.descriptors);
        // preserving the semantics of the object
        if (meta.isFrozen) {
            freeze(shadowTarget);
        } else if (meta.isSealed) {
            seal(shadowTarget);
        } else if (!meta.isExtensible) {
            preventExtensions(shadowTarget);
        }
        // resetting all traps except apply and construct for static proxies since the
        // proxy target is the shadow target and all operations are going to be applied
        // to it rather than the real target.
        delete proxyHandler.getOwnPropertyDescriptor;
        delete proxyHandler.getPrototypeOf;
        delete proxyHandler.get;
        delete proxyHandler.has;
        delete proxyHandler.ownKeys;
        delete proxyHandler.isExtensible;
        // those used by pending traps needs to exist so the pending trap can call them
        proxyHandler.set = ReflectSet;
        proxyHandler.defineProperty = defineProperty;
        proxyHandler.deleteProperty = deleteProperty;
        proxyHandler.setPrototypeOf = setPrototypeOf;
        proxyHandler.preventExtensions = preventExtensions;
        // future optimization: hoping that proxies with frozen handlers can be faster
        freeze(proxyHandler);
    }

    function makeRedProxyUnambiguous(proxyHandler: RedProxyHandler, shadowTarget: RedShadowTarget) {
        if (isMarkAsDynamic(proxyHandler.target)) {
            // when the target has the a descriptor for the magic symbol, use the Dynamic traps
            makeRedProxyDynamic(proxyHandler, shadowTarget);
        } else {
            makeRedProxyStatic(proxyHandler, shadowTarget);
        }
        // future optimization: hoping that proxies with frozen handlers can be faster
        freeze(proxyHandler);
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
    setPrototypeOf(RedProxyHandler.prototype, null);

    function createRedShadowTarget(blue: RedProxyTarget): RedShadowTarget {
        let shadowTarget;
        if (isFunction(blue)) {
            // this is never invoked just needed to anchor the realm for errors
            try {
                shadowTarget = 'prototype' in blue ? function () {} : () => {};
            } catch {
                // target is either a revoked proxy, or a proxy that throws on the has trap,
                // in which case going with the arrow function seems appropriate.
                shadowTarget = () => {};
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
            throw ErrorCreate('Internal Error');
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

}).toString();