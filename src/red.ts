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
} from './types';
import { MembraneBroker } from './environment';

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

export const serializedRedEnvSourceText = (function redEnvFactory(blueBroker: MembraneBroker, hooks: typeof Reflect) {
    'use strict';

    const { blueMap, distortionMap } = blueBroker;
    const { apply: blueReflectApply, construct: blueReflectConstruct } = hooks;

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
    } = Reflect;
    const {
        assign,
        create,
        defineProperty: ObjectDefineProperty,
        getOwnPropertyDescriptors,
        freeze,
        seal,
        isSealed,
        isFrozen,
        hasOwnProperty,
    } = Object;
    const ProxyRevocable = Proxy.revocable;
    const ProxyCreate = unconstruct(Proxy);
    const { isArray: isArrayOrNotOrThrowForRevoked } = Array;
    const noop = () => undefined;
    const map = unapply(Array.prototype.map);
    const WeakMapGet = unapply(WeakMap.prototype.get);
    const WeakMapHas = unapply(WeakMap.prototype.has);
    const ErrorCreate = unconstruct(Error);

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
        if (typeof blue === 'function') {
            return getRedFunction(blue);
        }
        let isBlueArray = false;
        try {
            isBlueArray = isArrayOrNotOrThrowForRevoked(blue);
        } catch {
            // blue was revoked - but we call createRedProxy to support distortions
            return createRedProxy(blue);
        }
        if (isBlueArray) {
            return getRedArray(blue);
        } else if (typeof blue === 'object') {
            const red: RedValue | undefined = WeakMapGet(blueMap, blue);
            if (isUndefined(red)) {
                return createRedProxy(blue);
            }
            return red;
        } else {
            return blue as RedValue;
        }
    }

    function getRedArray(blueArray: BlueArray): RedArray {
        const b: RedValue[] = map(blueArray, (blue: BlueValue) => getRedValue(blue));
        // identity of the new array correspond to the inner realm
        return [...b];
    }

    function getRedFunction(blueFn: BlueFunction): RedFunction {
        const redFn: RedFunction | undefined = WeakMapGet(blueMap, blueFn);
        if (isUndefined(redFn)) {
            return createRedProxy(blueFn) as RedFunction;
        }
        return redFn;
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
        let nameDescriptor: PropertyDescriptor | undefined;
        try {
            // a revoked proxy will break the membrane when reading the function name
            nameDescriptor = getOwnPropertyDescriptor(blueProvider, 'name');
        } catch (_ignored) {
            // intentionally swallowing the error because this method is just extracting the function
            // in a way that it should always succeed except for the cases in which the provider is a proxy
            // that is either revoked or has some logic to prevent reading the name property descriptor.
        }
        if (!isUndefined(nameDescriptor)) {
            defineProperty(receiver, 'name', nameDescriptor);
        }
    }    

    function installDescriptorIntoShadowTarget(shadowTarget: RedProxyTarget, key: PropertyKey, originalDescriptor: PropertyDescriptor) {
        const shadowTargetDescriptor = getOwnPropertyDescriptor(shadowTarget, key);
        if (!isUndefined(shadowTargetDescriptor)) {
            if (hasOwnProperty.call(shadowTargetDescriptor, 'configurable') &&
                    shadowTargetDescriptor.configurable === true) {
                defineProperty(shadowTarget, key, originalDescriptor);
            } else if (hasOwnProperty.call(shadowTargetDescriptor, 'writable') &&
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
            redDescriptor.value = isFunction(blueValue) ?
                // we are dealing with a method (optimization)
                getRedFunction(blueValue) : getRedValue(blueValue);
        } else {
            // we are dealing with accessors
            if (isFunction(blueSet)) {
                redDescriptor.set = getRedFunction(blueSet);
            }
            if (isFunction(blueGet)) {
                redDescriptor.get = getRedFunction(blueGet);
            }
        }
        return redDescriptor;
    }

    function copyRedOwnDescriptors(shadowTarget: RedShadowTarget, blueDescriptors: PropertyDescriptorMap) {
        for (const key in blueDescriptors) {
            // avoid poisoning by checking own properties from descriptors
            if (hasOwnProperty.call(blueDescriptors, key)) {
                const originalDescriptor = getRedDescriptor(blueDescriptors[key]);
                installDescriptorIntoShadowTarget(shadowTarget, key, originalDescriptor);
            }
        }
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

    class RedProxyHandler implements ProxyHandler<RedProxyTarget> {
        // original target for the proxy
        private readonly target: RedProxyTarget;
        // metadata about the shape of the target
        private readonly meta: TargetMeta;
    
        constructor(blue: RedProxyTarget, meta: TargetMeta) {
            this.target = blue;
            this.meta = meta;
        }
        // initialization used to avoid the initialization cost
        // of an object graph, we want to do it when the
        // first interaction happens.
        initialize(shadowTarget: RedShadowTarget) {
            const { meta } = this;
            const { proto: blueProto } = meta;
            // once the initialization is executed once... the rest is just noop 
            this.initialize = noop;
            // adjusting the proto chain of the shadowTarget (recursively)
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
            // future optimization: hoping that proxies with frozen handlers can be faster
            freeze(this);
        }
    
        get(shadowTarget: RedShadowTarget, key: PropertyKey, receiver: RedObject): RedValue {
            this.initialize(shadowTarget);
            return ReflectGet(shadowTarget, key, receiver);
        }
        set(shadowTarget: RedShadowTarget, key: PropertyKey, value: RedValue, receiver: RedObject): boolean {
            this.initialize(shadowTarget);
            return ReflectSet(shadowTarget, key, value, receiver);
        }
        deleteProperty(shadowTarget: RedShadowTarget, key: PropertyKey): boolean {
            this.initialize(shadowTarget);
            return deleteProperty(shadowTarget, key);
        }
        apply(shadowTarget: RedShadowTarget, redThisArg: RedValue, redArgArray: RedValue[]): RedValue {
            const { target: blueTarget } = this;
            this.initialize(shadowTarget);
            let blue;
            try {
                const blueThisArg = blueBroker.getBlueValue(redThisArg);
                const blueArgArray = blueBroker.getBlueValue(redArgArray);
                blue = blueReflectApply(blueTarget as BlueFunction, blueThisArg, blueArgArray);
            } catch (e) {
                // This error occurred when the sandbox attempts to call a
                // function from the blue realm. By throwing a new red error,
                // we eliminates the stack information from the blue realm as a consequence.
                let redError;
                const { message, constructor } = e;
                try {
                    // the error constructor must be a blue error since it occur when calling
                    // a function from the blue realm.
                    const redErrorConstructor = blueBroker.getRedRef(constructor);
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
        construct(shadowTarget: RedShadowTarget, redArgArray: RedValue[], redNewTarget: RedObject): RedObject {
            const { target: BlueCtor } = this;
            this.initialize(shadowTarget);
            if (isUndefined(redNewTarget)) {
                throw TypeError();
            }
            let blue;
            try {
                const blueNewTarget = blueBroker.getBlueValue(redNewTarget);
                const blueArgArray = blueBroker.getBlueValue(redArgArray);
                blue = blueReflectConstruct(BlueCtor as BlueConstructor, blueArgArray, blueNewTarget);
            } catch (e) {
                // This error occurred when the sandbox attempts to new a
                // constructor from the blue realm. By throwing a new red error,
                // we eliminates the stack information from the blue realm as a consequence.
                let redError;
                const { message, constructor } = e;
                try {
                    // the error constructor must be a blue error since it occur when calling
                    // a function from the blue realm.
                    const redErrorConstructor = blueBroker.getRedRef(constructor);
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
        has(shadowTarget: RedShadowTarget, key: PropertyKey): boolean {
            this.initialize(shadowTarget);
            return key in shadowTarget;
        }
        ownKeys(shadowTarget: RedShadowTarget): PropertyKey[] {
            this.initialize(shadowTarget);
            return ownKeys(shadowTarget);
        }
        isExtensible(shadowTarget: RedShadowTarget): boolean {
            this.initialize(shadowTarget);
            // No DOM API is non-extensible, but in the sandbox, the author
            // might want to make them non-extensible
            return isExtensible(shadowTarget);
        }
        getOwnPropertyDescriptor(shadowTarget: RedShadowTarget, key: PropertyKey): PropertyDescriptor | undefined {
            this.initialize(shadowTarget);
            return getOwnPropertyDescriptor(shadowTarget, key);
        }
        getPrototypeOf(shadowTarget: RedShadowTarget): RedValue {
            this.initialize(shadowTarget);
            // nothing to be done here since the shadowTarget must have the right proto chain
            return getPrototypeOf(shadowTarget);
        }
        setPrototypeOf(shadowTarget: RedShadowTarget, prototype: RedValue): boolean {
            this.initialize(shadowTarget);
            // this operation can only affect the env object graph
            return setPrototypeOf(shadowTarget, prototype);
        }
        preventExtensions(shadowTarget: RedShadowTarget): boolean {
            this.initialize(shadowTarget);
            // this operation can only affect the env object graph
            return preventExtensions(shadowTarget);
        }
        defineProperty(shadowTarget: RedShadowTarget, key: PropertyKey, redPartialDesc: PropertyDescriptor): boolean {
            this.initialize(shadowTarget);
            // this operation can only affect the env object graph
            // intentionally using Object.defineProperty instead of Reflect.defineProperty
            // to throw for existing non-configurable descriptors.
            ObjectDefineProperty(shadowTarget, key, redPartialDesc);
            return true;
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
                // TODO: target is a revoked proxy. This could be optimized if Meta becomes available here.
                shadowTarget = () => {};
            }
            renameFunction(blue as (...args: any[]) => any, shadowTarget);
        } else {
            // o is object
            shadowTarget = {};
        }
        return shadowTarget;
    }

    function getRevokedRedProxy(blue: RedProxyTarget): RedProxy {
        const shadowTarget = createRedShadowTarget(blue);
        const { proxy, revoke } = ProxyRevocable(shadowTarget, {});
        blueBroker.setRefMapEntries(proxy, blue);
        revoke();
        return proxy;
    }

    function createRedProxy(blue: RedProxyTarget): RedProxy {
        blue = getDistortedValue(blue);
        const meta = getTargetMeta(blue);
        let proxy;
        if (meta.isBroken) {
            proxy = getRevokedRedProxy(blue);
        } else {
            const shadowTarget = createRedShadowTarget(blue);
            const proxyHandler = new RedProxyHandler(blue, meta);
            proxy = ProxyCreate(shadowTarget, proxyHandler);
        }
        try {
            blueBroker.setRefMapEntries(proxy, blue);
        } catch (e) {
            // This is a very edge case, it could happen if someone is very
            // crafty, but basically can cause an overflow when invoking the
            // setRefMapEntries() method, which will report an error from
            // the blue realm.
            throw ErrorCreate('Internal Error');
        }
        return proxy;
    }

    return getRedValue;

}).toString();