import {
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
    map,
    isNullOrUndefined,
    unconstruct,
    ownKeys,
    ReflectIsExtensible,
    ReflectPreventExtensions,
    deleteProperty,
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
} from './types';
import { MembraneBroker } from './environment';
import { SandboxRegistry } from "./registry";
import { Evaluator } from "./types";

function renameFunction(provider: (...args: any[]) => any, receiver: (...args: any[]) => any) {
    let nameDescriptor: PropertyDescriptor | undefined;
    try {
        // a revoked proxy will break the membrane when reading the function name
        nameDescriptor = ReflectGetOwnPropertyDescriptor(provider, 'name');
    } catch (_ignored) {
        // intentionally swallowing the error because this method is just extracting the function
        // in a way that it should always succeed except for the cases in which the provider is a proxy
        // that is either revoked or has some logic to prevent reading the name property descriptor.
    }
    if (!isUndefined(nameDescriptor)) {
        ReflectDefineProperty(receiver, 'name', nameDescriptor);
    }
}

const ProxyRevocable = Proxy.revocable;
const ProxyCreate = unconstruct(Proxy);
const { isArray: isArrayOrNotOrThrowForRevoked } = Array;

function createBlueShadowTarget(target: BlueProxyTarget): BlueShadowTarget {
    let shadowTarget;
    if (isFunction(target)) {
        // this is never invoked just needed to anchor the realm
        try {
            shadowTarget = 'prototype' in target ? function () {} : () => {};
        } catch {
            // TODO: target is a revoked proxy. This could be optimized if Meta becomes available here.
            shadowTarget = () => {};
        }
        renameFunction(target as (...args: any[]) => any, shadowTarget as (...args: any[]) => any);
    } else {
        // o is object
        shadowTarget = {};
    }
    return shadowTarget;
}

export function blueProxyFactory(broker: MembraneBroker, hooks: typeof Reflect) {
    const { apply: redReflectApply, construct: redReflectConstruct } = hooks;

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
            redPartialDesc.value = broker.getRedValue(redPartialDesc.value);
        }
        if ('set' in redPartialDesc) {
            // we are dealing with accessors
            redPartialDesc.set = broker.getRedValue(redPartialDesc.set);
        }
        if ('get' in redPartialDesc) {
            redPartialDesc.get = broker.getRedValue(redPartialDesc.get);
        }
        return redPartialDesc;
    }

    function lockShadowTarget(shadowTarget: BlueShadowTarget, originalTarget: BlueProxyTarget) {
        const targetKeys = ownKeys(originalTarget);
        for (let i = 0, len = targetKeys.length; i < len; i += 1) {
            const key = targetKeys[i];
            const blueDesc = ReflectGetOwnPropertyDescriptor(shadowTarget, key);
            if (isUndefined(blueDesc) || blueDesc.configurable === true) {
                const redDesc = ReflectGetOwnPropertyDescriptor(originalTarget, key) as PropertyDescriptor;
                ReflectDefineProperty(shadowTarget, key, getBlueDescriptor(redDesc));
            }
        }
        ReflectPreventExtensions(shadowTarget);
    }

    class BlueProxyHandler implements ProxyHandler<BlueProxyTarget> {
        // original target for the proxy
        private readonly target: BlueProxyTarget;

        constructor(target: BlueProxyTarget) {
            this.target = target;
            // future optimization: hoping that proxies with frozen handlers can be faster
            freeze(this);
        }
        get(shadowTarget: BlueShadowTarget, key: PropertyKey, receiver: BlueObject): RedValue {
            return broker.getBlueValue(ReflectGet(this.target, key, broker.getRedValue(receiver)));
        }
        set(shadowTarget: BlueShadowTarget, key: PropertyKey, value: BlueValue, receiver: BlueObject): boolean {
            return ReflectSet(this.target, key, broker.getRedValue(value), broker.getRedValue(receiver));
        }
        deleteProperty(shadowTarget: BlueShadowTarget, key: PropertyKey): boolean {
            return deleteProperty(this.target, key);
        }
        apply(shadowTarget: BlueShadowTarget, blueThisArg: BlueValue, blueArgArray: BlueValue[]): BlueValue {
            const { target } = this;
            const redThisArg = broker.getRedValue(blueThisArg);
            const redArgArray = broker.getRedValue(blueArgArray);
            let red;
            try {
                red = redReflectApply(target as RedFunction, redThisArg, redArgArray);
            } catch (e) {
                // This error occurred when the blue realm attempts to call a
                // function from the sandbox. By throwing a new blue error, we eliminates the stack
                // information from the sandbox as a consequence.
                let blueError;
                const { message, constructor } = e;
                try {
                    // the error constructor must be a red error since it occur when calling
                    // a function from the sandbox.
                    const blueErrorConstructor = broker.getBlueRef(constructor);
                    // the blue constructor must be registered (done during construction of env)
                    // otherwise we need to fallback to a regular error.
                    blueError = construct(blueErrorConstructor as BlueFunction, [message]);
                } catch {
                    // in case the constructor inference fails
                    blueError = ErrorCreate(message);
                }
                throw blueError;
            }
            return broker.getBlueValue(red);
        }
        construct(shadowTarget: BlueShadowTarget, blueArgArray: BlueValue[], blueNewTarget: BlueObject): BlueObject {
            const { target: RedCtor } = this;
            if (isUndefined(blueNewTarget)) {
                throw TypeError();
            }
            const redArgArray = broker.getRedValue(blueArgArray);
            const redNewTarget = broker.getRedValue(blueNewTarget);
            let red;
            try {
                red = redReflectConstruct(RedCtor as RedConstructor, redArgArray, redNewTarget);
            } catch (e) {
                // This error occurred when the blue realm attempts to new a
                // constructor from the sandbox. By throwing a new blue error, we eliminates the stack
                // information from the sandbox as a consequence.
                let blueError;
                const { message, constructor } = e;
                try {
                    // the error constructor must be a red error since it occur when calling
                    // a function from the sandbox.
                    const blueErrorConstructor = broker.getBlueRef(constructor);
                    // the blue constructor must be registered (done during construction of env)
                    // otherwise we need to fallback to a regular error.
                    blueError = construct(blueErrorConstructor as BlueFunction, [message]);
                } catch {
                    // in case the constructor inference fails
                    blueError = ErrorCreate(message);
                }
                throw blueError;
            }
            return broker.getBlueValue(red);
        }
        has(shadowTarget: BlueShadowTarget, key: PropertyKey): boolean {
            return key in this.target;
        }
        ownKeys(shadowTarget: BlueShadowTarget): PropertyKey[] {
            return ownKeys(this.target);
        }
        isExtensible(shadowTarget: BlueShadowTarget): boolean {
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
            let blueDesc = ReflectGetOwnPropertyDescriptor(shadowTarget, key);
            if (!isUndefined(blueDesc)) {
                return blueDesc;
            }
            const redDesc = ReflectGetOwnPropertyDescriptor(target, key);
            if (isUndefined(redDesc)) {
                return redDesc;
            }
            blueDesc = getBlueDescriptor(redDesc);
            if (redDesc.configurable === false) {
                // updating the descriptor to non-configurable on the shadow
                ReflectDefineProperty(shadowTarget, key, blueDesc);
            }
            return blueDesc;
        }
        getPrototypeOf(shadowTarget: BlueShadowTarget): BlueValue {
            return broker.getBlueValue(ReflectGetPrototypeOf(this.target));
        }
        setPrototypeOf(shadowTarget: BlueShadowTarget, prototype: BlueValue): boolean {
            return ReflectSetPrototypeOf(this.target, broker.getRedValue(prototype));
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
                    // defining the descriptor to non-configurable on the shadow target
                    ReflectDefineProperty(shadowTarget, key, bluePartialDesc);
                }
            }
            return true;
        }
    }

    ReflectSetPrototypeOf(BlueProxyHandler.prototype, null);

    function getBlueValue(red: RedValue): BlueValue {
        if (isNullOrUndefined(red)) {
            return red as BlueValue;
        }
        // internationally ignoring the case of (typeof document.all === 'undefined') because
        // in the reserve membrane, you never get one of those exotic objects
        if (typeof red === 'function') {
            return getBlueFunction(red);
        }
        let isRedArray = false;
        try {
            isRedArray = isArrayOrNotOrThrowForRevoked(red);
        } catch {
            return getRevokedBlueProxy(red);
        }
        if (isRedArray) {
            return getBlueArray(red);
        } else if (typeof red === 'object') {
            const blue = broker.getBlueRef(red);
            if (isUndefined(blue)) {
                return createBlueProxy(red);
            }
            return blue;
        }
        return red as BlueValue;
    }

    function getBlueFunction(redFn: RedFunction): BlueFunction {
        const blueFn = broker.getBlueRef(redFn);
        if (isUndefined(blueFn)) {
            try {
                // just in case the fn is a revoked proxy (extra protection)
                isArrayOrNotOrThrowForRevoked(redFn);
            } catch {
                return getRevokedBlueProxy(redFn) as BlueFunction;
            }
            return createBlueProxy(redFn) as BlueFunction;
        }
        return blueFn as RedFunction;
    }

    function getBlueArray(redArray: RedArray): BlueArray {
        // identity of the new array correspond to the blue realm
        return map(redArray, (red: RedValue) => getBlueValue(red));
    }

    function getRevokedBlueProxy(red: BlueProxyTarget): BlueProxy {
        const shadowTarget = createBlueShadowTarget(red);
        const { proxy, revoke } = ProxyRevocable(shadowTarget, {});
        broker.setRefMapEntries(red, proxy);
        revoke();
        return proxy;
    }

    function createBlueProxy(red: BlueProxyTarget): BlueProxy {
        const shadowTarget = createBlueShadowTarget(red);
        const proxyHandler = new BlueProxyHandler(red);
        const proxy = ProxyCreate(shadowTarget, proxyHandler);
        broker.setRefMapEntries(red, proxy);
        return proxy;
    }

    return getBlueValue;

}

/**
 * This method is responsible for guaranteeing that the evaluator function
 * does not leak an instance of an error from within the sandbox.
 */
export function controlledEvaluator(registry: SandboxRegistry, evaluator: Evaluator): Evaluator {
    // finally, we return the evaluator function wrapped by an error control flow
    return (sourceText: string): void => {
        try {
            evaluator(sourceText);
        } catch (e) {
            // This error occurred when the blue realm attempts to evaluate a
            // sourceText into the sandbox. By throwing a new blue error, which
            // eliminates the stack information from the sandbox as a consequence.
            let blueError;
            const { message, constructor } = e;
            try {
                const blueErrorConstructor = registry.getBlueRef(constructor);
                // the constructor must be registered (done during construction of env)
                // otherwise we need to fallback to a regular error.
                blueError = construct(blueErrorConstructor as BlueFunction, [message]);
            } catch {
                // in case the constructor inference fails
                blueError = ErrorCreate(message);
            }
            throw blueError;
        }
    };
}
