import {
    apply,
    assign,
    construct,
    ReflectSetPrototypeOf,
    freeze,
    isFunction,
    ObjectCreate,
    isUndefined,
    ReflectGetOwnPropertyDescriptor,
    ReflectDefineProperty,
    ErrorCreate,
    ReflectGetPrototypeOf,
    ReflectGet,
    ReflectSet,
    ReflectHas,
    map,
    isNullOrUndefined,
    unconstruct,
    ownKeys,
    ReflectIsExtensible,
    ReflectPreventExtensions,
    deleteProperty,
    hasOwnProperty,
    emptyArray,
} from './shared';
import {
    BlueProxyTarget,
    BlueValue,
    BlueObject,
    RedConstructor,
    RedFunction,
    BlueShadowTarget,
    BlueProxy,
    BlueFunction,
    RedArray,
    BlueArray,
    RedValue,
    MembraneBroker,
} from './types';

function renameFunction(provider: RedFunction, receiver: BlueFunction) {
    try {
        // a revoked proxy will break the membrane when reading the function name
        const nameDescriptor = ReflectGetOwnPropertyDescriptor(provider, 'name')!;
        ReflectDefineProperty(receiver, 'name', nameDescriptor);
    } catch {
        // intentionally swallowing the error because this method is just extracting the function
        // in a way that it should always succeed except for the cases in which the provider is a proxy
        // that is either revoked or has some logic to prevent reading the name property descriptor.
    }
}

const ProxyCreate = unconstruct(Proxy);
const { isArray: isArrayOrNotOrThrowForRevoked } = Array;

function createBlueShadowTarget(target: BlueProxyTarget): BlueShadowTarget {
    let shadowTarget;
    if (isFunction(target)) {
        // this new shadow target function is never invoked just needed to anchor the realm
        try {
            shadowTarget = 'prototype' in target ? function () {} : () => {};
        } catch {
            // target is a revoked proxy
            shadowTarget = () => {};
        }
        // This is only really needed for debugging, it helps to identify the proxy by name
        renameFunction(target as (...args: any[]) => any, shadowTarget as (...args: any[]) => any);
    } else {
        let isRedArray = false;
        try {
            // try/catch in case Array.isArray throws when target is a revoked proxy
            isRedArray = isArrayOrNotOrThrowForRevoked(target);
        } catch {
            // target is a revoked proxy, ignoring...
        }
        // target is array or object
        shadowTarget = isRedArray ? [] : {};
    }
    return shadowTarget;
}

export function blueProxyFactory(env: MembraneBroker) {

    function getBlueDescriptor(redDesc: PropertyDescriptor): PropertyDescriptor {
        const blueDesc = assign(ObjectCreate(null), redDesc);
        const { value, get, set } = blueDesc;
        if ('writable' in blueDesc) {
            // we are dealing with a value descriptor
            blueDesc.value = isFunction(value) ?
                // we are dealing with a method (optimization)
                getBlueFunction(value) : getBlueValue(value);
        } else {
            // we are dealing with accessors
            if (isFunction(set)) {
                blueDesc.set = getBlueFunction(set);
            }
            if (isFunction(get)) {
                blueDesc.get = getBlueFunction(get);
            }
        }
        return blueDesc;
    }

    function getRedPartialDescriptor(bluePartialDesc: PropertyDescriptor): PropertyDescriptor {
        const redPartialDesc = assign(ObjectCreate(null), bluePartialDesc);
        if ('value' in redPartialDesc) {
            // we are dealing with a value descriptor
            redPartialDesc.value = env.getRedValue(redPartialDesc.value);
        }
        if ('set' in redPartialDesc) {
            // we are dealing with accessors
            redPartialDesc.set = env.getRedValue(redPartialDesc.set);
        }
        if ('get' in redPartialDesc) {
            redPartialDesc.get = env.getRedValue(redPartialDesc.get);
        }
        return redPartialDesc;
    }

    function copyRedDescriptorIntoShadowTarget(shadowTarget: BlueShadowTarget, originalTarget: BlueProxyTarget, key: PropertyKey) {
        // Note: a property might get defined multiple times in the shadowTarget
        //       but it will always be compatible with the previous descriptor
        //       to preserve the object invariants, which makes these lines safe.
        const normalizedRedDescriptor = ReflectGetOwnPropertyDescriptor(originalTarget, key);
        if (!isUndefined(normalizedRedDescriptor)) {
            const blueDesc = getBlueDescriptor(normalizedRedDescriptor);
            ReflectDefineProperty(shadowTarget, key, blueDesc);
        }
    }

    function lockShadowTarget(shadowTarget: BlueShadowTarget, originalTarget: BlueProxyTarget) {
        const targetKeys = ownKeys(originalTarget);
        for (let i = 0, len = targetKeys.length; i < len; i += 1) {
            copyRedDescriptorIntoShadowTarget(shadowTarget, originalTarget, targetKeys[i]);
        }
        ReflectPreventExtensions(shadowTarget);
    }

    function getStaticRedArray(blueArray: BlueArray): RedArray {
        return map(blueArray, env.getRedValue);
    }

    class BlueDynamicProxyHandler implements ProxyHandler<BlueProxyTarget> {
        // original target for the proxy
        private readonly target: BlueProxyTarget;

        constructor(target: BlueProxyTarget) {
            this.target = target;
            // future optimization: hoping that proxies with frozen handlers can be faster
            freeze(this);
        }
        deleteProperty(shadowTarget: BlueShadowTarget, key: PropertyKey): boolean {
            return deleteProperty(this.target, key);
        }
        apply(shadowTarget: BlueShadowTarget, blueThisArg: BlueValue, blueArgArray: BlueValue[]): BlueValue {
            const { target } = this;
            const redThisArg = env.getRedValue(blueThisArg);
            const redArgArray = getStaticRedArray(blueArgArray);
            let red;
            try {
                red = apply(target as RedFunction, redThisArg, redArgArray);
            } catch (e) {
                // This error occurred when the blue realm attempts to call a
                // function from the sandbox. By throwing a new blue error, we eliminates the stack
                // information from the sandbox as a consequence.
                let blueError;
                const { message, constructor } = e;
                try {
                    // the error constructor must be a red error since it occur when calling
                    // a function from the sandbox.
                    const blueErrorConstructor = env.getBlueRef(constructor);
                    // the blue constructor must be registered (done during construction of env)
                    // otherwise we need to fallback to a regular error.
                    blueError = construct(blueErrorConstructor as BlueFunction, [message]);
                } catch {
                    // in case the constructor inference fails
                    blueError = ErrorCreate(message);
                }
                throw blueError;
            }
            return env.getBlueValue(red);
        }
        construct(shadowTarget: BlueShadowTarget, blueArgArray: BlueValue[], blueNewTarget: BlueObject): BlueObject {
            const { target: RedCtor } = this;
            if (isUndefined(blueNewTarget)) {
                throw TypeError();
            }
            const redNewTarget = env.getRedValue(blueNewTarget);
            const redArgArray = getStaticRedArray(blueArgArray);
            let red;
            try {
                red = construct(RedCtor as RedConstructor, redArgArray, redNewTarget);
            } catch (e) {
                // This error occurred when the blue realm attempts to new a
                // constructor from the sandbox. By throwing a new blue error, we eliminates the stack
                // information from the sandbox as a consequence.
                let blueError;
                const { message, constructor } = e;
                try {
                    // the error constructor must be a red error since it occur when calling
                    // a function from the sandbox.
                    const blueErrorConstructor = env.getBlueRef(constructor);
                    // the blue constructor must be registered (done during construction of env)
                    // otherwise we need to fallback to a regular error.
                    blueError = construct(blueErrorConstructor as BlueFunction, [message]);
                } catch {
                    // in case the constructor inference fails
                    blueError = ErrorCreate(message);
                }
                throw blueError;
            }
            return env.getBlueValue(red);
        }
        /**
         * This trap cannot just use `Reflect.get` directly on the `target` because
         * the red object graph might have mutations that are only visible on the red side,
         * which means looking into `target` directly is not viable. Instead, we need to
         * implement a more crafty solution that looks into target's own properties, or
         * in the red proto chain when needed.
         */
        get(shadowTarget: BlueShadowTarget, key: PropertyKey, receiver: BlueObject): RedValue {
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
            const redDescriptor = ReflectGetOwnPropertyDescriptor(target, key);
            if (isUndefined(redDescriptor)) {
                // looking in the blue proto chain to avoid switching sides
                const blueProto = getBlueValue(ReflectGetPrototypeOf(target));
                return ReflectGet(blueProto, key, receiver);
            }
            if (hasOwnProperty(redDescriptor, 'get')) {
                // Knowing that it is an own getter, we can't still not use Reflect.get
                // because there might be a distortion for such getter, and from the blue
                // side, we should not be subject to those distortions.
                return apply(getBlueValue(redDescriptor.get), receiver, emptyArray);
            }
            // if it is not an accessor property, is either a setter only accessor
            // or a data property, in which case we could return undefined or the blue value
            return getBlueValue(redDescriptor.value);
        }
        /**
         * This trap cannot just use `Reflect.set` directly on the `target` on the
         * red side because the red object graph might have mutations that are only visible
         * on the red side, which means looking into `target` directly is not viable.
         * Instead, we need to implement a more crafty solution that looks into target's
         * own properties, or in the blue proto chain when needed.
         */
        set(shadowTarget: BlueShadowTarget, key: PropertyKey, value: BlueValue, receiver: BlueObject): boolean {
            const { target } = this;
            const redDescriptor = ReflectGetOwnPropertyDescriptor(target, key);
            if (isUndefined(redDescriptor)) {
                // looking in the blue proto chain to avoid switching sides
                const blueProto = getBlueValue(ReflectGetPrototypeOf(target));
                return ReflectSet(blueProto, key, value, receiver);
            }
            if (hasOwnProperty(redDescriptor, 'set')) {
                // even though the setter function exists, we can't use Reflect.set because there might be
                // a distortion for that setter function, and from the blue side, we should not be subject
                // to those distortions.
                apply(getBlueValue(redDescriptor.set), receiver, [value]);
                return true; // if there is a callable setter, it either throw or we can assume the value was set
            }
            // if it is not an accessor property, is either a getter only accessor
            // or a data property, in which case we use Reflect.set to set the value,
            // and no receiver is needed since it will simply set the data property or nothing
            return ReflectSet(target, key, env.getRedValue(value));
        }
        /**
         * This trap cannot just use `Reflect.has` or the `in` operator directly on the
         * red side because the red object graph might have mutations that are only visible
         * on the red side, which means looking into `target` directly is not viable.
         * Instead, we need to implement a more crafty solution that looks into target's
         * own properties, or in the blue proto chain when needed.
         */
        has(shadowTarget: BlueShadowTarget, key: PropertyKey): boolean {
            const { target } = this;
            if (hasOwnProperty(target, key)) {
                return true;
            }
            // looking in the blue proto chain to avoid switching sides
            const blueProto = getBlueValue(ReflectGetPrototypeOf(target));
            return ReflectHas(blueProto, key);
        }
        ownKeys(shadowTarget: BlueShadowTarget): PropertyKey[] {
            return ownKeys(this.target);
        }
        isExtensible(shadowTarget: BlueShadowTarget): boolean {
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
        getOwnPropertyDescriptor(shadowTarget: BlueShadowTarget, key: PropertyKey): PropertyDescriptor | undefined {
            const { target } = this;
            const redDesc = ReflectGetOwnPropertyDescriptor(target, key);
            if (isUndefined(redDesc)) {
                return redDesc;
            }
            if (redDesc.configurable === false) {
                // updating the descriptor to non-configurable on the shadow
                copyRedDescriptorIntoShadowTarget(shadowTarget, target, key);
            }
            return getBlueDescriptor(redDesc);
        }
        getPrototypeOf(shadowTarget: BlueShadowTarget): BlueValue {
            return env.getBlueValue(ReflectGetPrototypeOf(this.target));
        }
        setPrototypeOf(shadowTarget: BlueShadowTarget, prototype: BlueValue): boolean {
            return ReflectSetPrototypeOf(this.target, env.getRedValue(prototype));
        }
        preventExtensions(shadowTarget: BlueShadowTarget): boolean {
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
        defineProperty(shadowTarget: BlueShadowTarget, key: PropertyKey, bluePartialDesc: PropertyDescriptor): boolean {
            const { target } = this;
            const redDesc = getRedPartialDescriptor(bluePartialDesc);
            if (ReflectDefineProperty(target, key, redDesc)) {
                // intentionally testing against true since it could be undefined as well
                if (redDesc.configurable === false) {
                    copyRedDescriptorIntoShadowTarget(shadowTarget, target, key);
                }
            }
            return true;
        }
    }
    ReflectSetPrototypeOf(BlueDynamicProxyHandler.prototype, null);
    // future optimization: hoping that proxies with frozen handlers can be faster
    freeze(BlueDynamicProxyHandler.prototype);

    function getBlueValue(red: RedValue): BlueValue {
        if (isNullOrUndefined(red)) {
            return red as BlueValue;
        }
        if (typeof red === 'function') {
            return getBlueFunction(red);
        } else if (typeof red === 'object') {
            // arrays and objects
            const blue = env.getBlueRef(red);
            if (isUndefined(blue)) {
                return createBlueProxy(red);
            }
            return blue;
        }
        // internationally ignoring the case of (typeof document.all === 'undefined') because
        // in the reserve membrane, you never get one of those exotic objects
        return red as BlueValue;
    }

    function getBlueFunction(redFn: RedFunction): BlueFunction {
        const blueFn = env.getBlueRef(redFn);
        if (isUndefined(blueFn)) {
            return createBlueProxy(redFn) as BlueFunction;
        }
        return blueFn as RedFunction;
    }

    function createBlueProxy(red: BlueProxyTarget): BlueProxy {
        const shadowTarget = createBlueShadowTarget(red);
        const proxyHandler = new BlueDynamicProxyHandler(red);
        const proxy = ProxyCreate(shadowTarget, proxyHandler);
        env.setRefMapEntries(red, proxy);
        return proxy;
    }

    return getBlueValue;

}
