/* eslint-disable @typescript-eslint/no-use-before-define */
import {
    ArrayCtor,
    emptyArray,
    ObjectDefineProperties,
    ObjectFreeze,
    ObjectGetOwnPropertyDescriptors,
    ObjectHasOwnProperty,
    ReflectApply,
    ReflectConstruct,
    ReflectDefineProperty,
    ReflectDeleteProperty,
    ReflectGet,
    ReflectGetOwnPropertyDescriptor,
    ReflectGetPrototypeOf,
    ReflectHas,
    ReflectIsExtensible,
    ReflectOwnKeys,
    ReflectPreventExtensions,
    ReflectSet,
    ReflectSetPrototypeOf,
    TypeErrorCtor,
    WeakMapGet,
} from './shared';
import {
    BlueArray,
    BlueFunction,
    BlueObject,
    BlueProxy,
    BlueProxyTarget,
    BlueShadowTarget,
    BlueValue,
    MembraneBroker,
    RedArray,
    RedConstructor,
    RedFunction,
    RedValue,
    ProxyTargetType,
    BlueArrayOrObject,
    RedArrayOrObject,
} from './types';

const ProxyCtor = Proxy;
const { isArray: isArrayOrNotOrThrowForRevoked } = Array;

function createShadowTarget(
    targetTypeof: string,
    targetIsArrowFunction: boolean,
    targetFunctionName: string | undefined,
    targetIsArray: boolean
): BlueShadowTarget {
    let shadowTarget;
    if (targetTypeof === 'function') {
        // this new shadow target function is never invoked just needed to anchor the realm
        // According the comment above, this function will never be called, therefore the
        // code should not be instrumented for code coverage.
        //
        // istanbul ignore next
        // eslint-disable-next-line func-names
        shadowTarget = targetIsArrowFunction ? () => {} : function () {};
        // This is only really needed for debugging, it helps to identify the proxy by name
        ReflectDefineProperty(shadowTarget, 'name', {
            value: targetFunctionName,
            configurable: true,
        });
    } else {
        // target is array or object
        shadowTarget = targetIsArray ? [] : {};
    }
    return shadowTarget;
}

export function blueProxyFactory(env: MembraneBroker) {
    function copyRedDescriptorIntoShadowTarget(
        shadowTarget: BlueShadowTarget,
        originalTarget: BlueProxyTarget,
        key: PropertyKey
    ) {
        // Note: a property might get defined multiple times in the shadowTarget
        //       but it will always be compatible with the previous descriptor
        //       to preserve the object invariants, which makes these lines safe.
        const normalizedRedDescriptor = ReflectGetOwnPropertyDescriptor(originalTarget, key);
        // There is currently no test in Locker or near-membrane-* that does NOT
        // evaluate to true in the following condition.
        //
        // istanbul ignore else
        if (normalizedRedDescriptor !== undefined) {
            const blueDesc = getBlueDescriptor(normalizedRedDescriptor);
            ReflectDefineProperty(shadowTarget, key, blueDesc);
        }
    }

    function copyRedDescriptorsIntoShadowTarget(
        shadowTarget: BlueShadowTarget,
        originalTarget: BlueProxyTarget
    ) {
        const normalizedRedDescriptors = ObjectGetOwnPropertyDescriptors(originalTarget);
        const targetKeys = ReflectOwnKeys(normalizedRedDescriptors);
        const blueDescriptors: PropertyDescriptorMap = { __proto__: null } as any;
        for (let i = 0, len = targetKeys.length; i < len; i += 1) {
            const key = targetKeys[i] as string;
            const blueDesc = getBlueDescriptor(normalizedRedDescriptors[key]);
            blueDescriptors[key] = blueDesc;
        }
        // Use `ObjectDefineProperties()` instead of individual
        // `ReflectDefineProperty()` calls for better performance.
        ObjectDefineProperties(shadowTarget, blueDescriptors);
    }

    function createBlueProxy(
        red: BlueProxyTarget,
        targetTypeof: ProxyTargetType,
        targetIsArrowFunction: boolean,
        targetFunctionName: string | undefined,
        targetIsArray: boolean
    ): BlueProxy {
        const shadowTarget = createShadowTarget(
            targetTypeof,
            targetIsArrowFunction,
            targetFunctionName,
            targetIsArray
        );
        const proxyHandler = new BlueDynamicProxyHandler(red);
        const proxy = new ProxyCtor(shadowTarget, proxyHandler as ProxyHandler<object>);
        env.setRefMapEntries(red, proxy);
        return proxy;
    }

    function getBlueDescriptor(redDescriptor: PropertyDescriptor): PropertyDescriptor {
        const blueDescriptor = {
            __proto__: null,
            ...redDescriptor,
        };
        // The following "else" consequent is reachable in very specific
        // circumstances. The "preventAttachShadowPoisoning" test in
        // locker/packages/integration-karma/test/distortions/Element/Element-attachRoot.spec.js
        // relies on that path. The test itself is for the shadowRoot mode distortion and looks
        // approximately like:
        //
        //  expect(() => {
        //      const el = document.createElement('my-component');
        //      let count = 0;
        //      el.attachShadow({
        //          get mode() {
        //              return count++ ? 'open' : 'closed';
        //          },
        //      });
        //      expect(el.shadowRoot).toBe(null);
        //  }).not.toThrow();
        //
        // This package's (near-membrane-base) own tests do not provide for DOM testing,
        // therefore direct testing is not possible.
        //
        // istanbul ignore else
        if ('writable' in blueDescriptor) {
            // We are dealing with a value descriptor.
            blueDescriptor.value = getBlueValue(blueDescriptor.value);
        } else {
            // See additional details above.
            // We are dealing with accessors.
            const { get, set } = blueDescriptor;
            if (get !== undefined) {
                blueDescriptor.get = getBlueValue(get);
            }
            if (set !== undefined) {
                blueDescriptor.set = getBlueValue(set);
            }
        }
        return blueDescriptor;
    }

    function getBlueFunction(redFn: RedFunction): BlueFunction {
        // caching logic
        const blueFn = WeakMapGet(env.redMap, redFn) as RedFunction | undefined;
        if (blueFn !== undefined) {
            return blueFn;
        }
        // extracting the metadata about the proxy target
        const targetTypeof = 'function';
        let targetIsArrowFunction = false;
        let targetFunctionName: string | undefined;
        const targetIsArray = false;
        // detecting arrow function vs function
        try {
            targetIsArrowFunction = !('prototype' in redFn);
        } catch {
            // target is either a revoked proxy, or a proxy that throws on the
            // `has` trap, in which case going with a strict mode function seems
            // appropriate.
        }
        try {
            // a revoked proxy will throw when reading the function name
            targetFunctionName = ReflectGetOwnPropertyDescriptor(redFn, 'name')?.value;
        } catch {
            // intentionally swallowing the error because this method is just extracting the
            // function in a way that it should always succeed except for the cases in which
            // the provider is a proxy that is either revoked or has some logic to prevent
            // reading the name property descriptor.
        }
        return createBlueProxy(
            redFn,
            targetTypeof,
            targetIsArrowFunction,
            targetFunctionName,
            targetIsArray
        ) as BlueFunction;
    }

    function getBlueObjectOrArray(red: RedArrayOrObject): BlueArrayOrObject {
        // caching logic
        const blue: RedArrayOrObject | undefined = WeakMapGet(env.redMap, red);
        if (blue !== undefined) {
            return blue;
        }
        // extracting the metadata about the proxy target
        const targetTypeof = 'object';
        const targetIsArrowFunction = false;
        const targetFunctionName = undefined;
        let targetIsArray = false;
        try {
            // try/catch in case Array.isArray throws when target is a revoked proxy
            targetIsArray = isArrayOrNotOrThrowForRevoked(red);
        } catch {
            // target is a revoked proxy, so the type doesn't matter much from this point on
        }
        return (createBlueProxy(
            (red as unknown) as BlueProxyTarget,
            targetTypeof,
            targetIsArrowFunction,
            targetFunctionName,
            targetIsArray
        ) as unknown) as BlueArrayOrObject;
    }

    function getBlueValue<T>(red: T): T {
        if (red === null || red === undefined) {
            return red as BlueValue;
        }
        // internationally ignoring the case of (typeof document.all === 'undefined') because
        // in the reserve membrane, you never get one of those exotic objects

        // new proxy creation logic
        if (typeof red === 'function') {
            return (getBlueFunction((red as unknown) as RedFunction) as unknown) as T;
        }
        if (typeof red === 'object') {
            return (getBlueObjectOrArray((red as unknown) as RedArrayOrObject) as unknown) as T;
        }
        return red;
    }

    function getRedPartialDescriptor(bluePartialDesc: PropertyDescriptor): PropertyDescriptor {
        const redPartialDesc = {
            __proto__: null,
            ...bluePartialDesc,
        };

        if ('value' in redPartialDesc) {
            // We are dealing with a value descriptor.
            redPartialDesc.value = env.getRedValue(redPartialDesc.value);
        }
        // There is currently no test in Locker or near-membrane-* that evaluates to
        // true in this condition
        //
        // istanbul ignore if
        if ('set' in redPartialDesc) {
            // We are dealing with accessors.
            redPartialDesc.set = env.getRedValue(redPartialDesc.set);
        }
        // There is currently no test in Locker or near-membrane-* that evaluates to
        // true in this condition
        //
        // istanbul ignore if
        if ('get' in redPartialDesc) {
            redPartialDesc.get = env.getRedValue(redPartialDesc.get);
        }
        return redPartialDesc;
    }

    function getStaticRedArray(blueArray: BlueArray): RedArray {
        const { length } = blueArray;
        const staticRedArray = new ArrayCtor(length);
        for (let i = 0; i < length; i += 1) {
            // There is currently no test in Locker or near-membrane-* that evaluates to
            // true in this condition
            //
            // (For some reason, istanbul is getting confused here and only works for
            // "istanbul ignore next")
            // istanbul ignore next
            if (i in blueArray) {
                staticRedArray[i] = env.getRedValue(blueArray[i]);
            }
        }
        return staticRedArray;
    }

    function lockShadowTarget(shadowTarget: BlueShadowTarget, originalTarget: BlueProxyTarget) {
        copyRedDescriptorsIntoShadowTarget(shadowTarget, originalTarget);
        // setting up __proto__ of the shadowTarget
        ReflectSetPrototypeOf(shadowTarget, getBlueValue(ReflectGetPrototypeOf(originalTarget)));
        // locking down the extensibility of shadowTarget
        ReflectPreventExtensions(shadowTarget);
    }

    class BlueDynamicProxyHandler implements ProxyHandler<BlueProxyTarget> {
        // original target for the proxy
        private readonly target: BlueProxyTarget;

        constructor(target: BlueProxyTarget) {
            this.target = target;
            // future optimization: hoping that proxies with frozen handlers can be faster
            ObjectFreeze(this);
        }

        apply(
            shadowTarget: BlueShadowTarget,
            blueThisArg: BlueValue,
            blueArgArray: BlueValue[]
        ): BlueValue {
            const { target } = this;
            const redThisArg = env.getRedValue(blueThisArg);
            const redArgArray = getStaticRedArray(blueArgArray);
            let red;
            try {
                red = ReflectApply(target as RedFunction, redThisArg, redArgArray);
            } catch (e) {
                throw getBlueValue(e);
            }
            return getBlueValue(red);
        }

        // There is currently no test in Locker or near-membrane-* that exercises this trap
        //
        // istanbul ignore next
        construct(
            shadowTarget: BlueShadowTarget,
            blueArgArray: BlueValue[],
            blueNewTarget: BlueObject
        ): BlueValue {
            const { target: RedCtor } = this;
            if (blueNewTarget === undefined) {
                throw new TypeErrorCtor();
            }
            const redNewTarget = env.getRedValue(blueNewTarget);
            const redArgArray = getStaticRedArray(blueArgArray);
            let red;
            try {
                red = ReflectConstruct(RedCtor as RedConstructor, redArgArray, redNewTarget);
            } catch (e) {
                throw getBlueValue(e);
            }
            return getBlueValue(red);
        }

        defineProperty(
            shadowTarget: BlueShadowTarget,
            key: PropertyKey,
            bluePartialDesc: PropertyDescriptor
        ): boolean {
            const { target } = this;
            const redDesc = getRedPartialDescriptor(bluePartialDesc);
            if (ReflectDefineProperty(target, key, redDesc)) {
                // intentionally testing against true since it could be undefined as well
                // There is currently no test in Locker or near-membrane-* that does NOT
                // evaluate to true in this condition
                //
                // istanbul ignore else
                if (redDesc.configurable === false) {
                    copyRedDescriptorIntoShadowTarget(shadowTarget, target, key);
                }
            }
            return true;
        }

        deleteProperty(shadowTarget: BlueShadowTarget, key: PropertyKey): boolean {
            return ReflectDeleteProperty(this.target, key);
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
             * If the target has a non-configurable own data descriptor that was observed by the
             * red side, and therefore installed in the shadowTarget, we might get into a
             * situation where a writable, non-configurable value in the target is out of sync
             * with the shadowTarget's value for the same key. This is fine because this does
             * not violate the object invariants, and even though they are out of sync, the
             * original descriptor can only change to something that is compatible with what
             * was installed in shadowTarget, and in order to observe that, the
             * getOwnPropertyDescriptor trap must be used, which will take care of synchronizing
             * them again.
             */
            const { target } = this;
            const redDescriptor = ReflectGetOwnPropertyDescriptor(target, key);
            if (redDescriptor === undefined) {
                // looking in the blue proto chain to avoid switching sides
                const blueProto = getBlueValue(ReflectGetPrototypeOf(target));
                // There is currently no test in Locker or near-membrane-* that evaluates to
                // true in this condition
                //
                // istanbul ignore if
                if (blueProto === null) {
                    return undefined;
                }
                return ReflectGet(blueProto, key, receiver);
            }
            // There is currently no test in Locker or near-membrane-* that evaluates to
            // true in this condition
            //
            // istanbul ignore if
            if (ObjectHasOwnProperty(redDescriptor, 'get')) {
                // Knowing that it is an own getter, we can't still not use Reflect.get
                // because there might be a distortion for such getter, and from the blue
                // side, we should not be subject to those distortions.
                return ReflectApply(getBlueValue(redDescriptor.get!), receiver, emptyArray);
            }
            // if it is not an accessor property, is either a setter only accessor
            // or a data property, in which case we could return undefined or the blue value
            return getBlueValue(redDescriptor.value);
        }

        getOwnPropertyDescriptor(
            shadowTarget: BlueShadowTarget,
            key: PropertyKey
        ): PropertyDescriptor | undefined {
            const { target } = this;
            const redDesc = ReflectGetOwnPropertyDescriptor(target, key);
            if (redDesc === undefined) {
                return redDesc;
            }
            if (redDesc.configurable === false) {
                // updating the descriptor to non-configurable on the shadow
                copyRedDescriptorIntoShadowTarget(shadowTarget, target, key);
            }
            return getBlueDescriptor(redDesc);
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        getPrototypeOf(shadowTarget: BlueShadowTarget): BlueValue {
            return getBlueValue(ReflectGetPrototypeOf(this.target));
        }

        /**
         * This trap cannot just use `Reflect.has` or the `in` operator directly on the
         * red side because the red object graph might have mutations that are only visible
         * on the red side, which means looking into `target` directly is not viable.
         * Instead, we need to implement a more crafty solution that looks into target's
         * own properties, or in the blue proto chain when needed.
         */

        // There is currently no test in Locker or near-membrane-* that exercises this trap
        //
        // istanbul ignore next
        has(shadowTarget: BlueShadowTarget, key: PropertyKey): boolean {
            const { target } = this;
            if (ObjectHasOwnProperty(target, key)) {
                return true;
            }
            // looking in the blue proto chain to avoid switching sides
            const blueProto = getBlueValue(ReflectGetPrototypeOf(target));
            return blueProto !== null && ReflectHas(blueProto, key);
        }

        isExtensible(shadowTarget: BlueShadowTarget): boolean {
            // optimization to avoid attempting to lock down the shadowTarget multiple times
            if (!ReflectIsExtensible(shadowTarget)) {
                return false; // was already locked down
            }
            const { target } = this;
            // There is currently no test in Locker or near-membrane-* that evaluates to
            // true in this condition
            //
            // istanbul ignore if
            if (!ReflectIsExtensible(target)) {
                lockShadowTarget(shadowTarget, target);
                return false;
            }
            return true;
        }

        ownKeys(
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            shadowTarget: BlueShadowTarget
        ): PropertyKey[] {
            return ReflectOwnKeys(this.target);
        }

        preventExtensions(shadowTarget: BlueShadowTarget): boolean {
            const { target } = this;
            // There is currently no test in Locker or near-membrane-* that does NOT
            // evaluate to true in this condition
            //
            // istanbul ignore else
            if (ReflectIsExtensible(shadowTarget)) {
                // There is currently no test in Locker or near-membrane-* that evaluates to
                // true in this condition
                //
                // istanbul ignore if
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
            // There is currently no test in Locker or near-membrane-* that reaches this
            // statement.
            //
            // istanbul ignore next
            return true;
        }

        /**
         * This trap cannot just use `Reflect.set` directly on the `target` on the
         * red side because the red object graph might have mutations that are only visible
         * on the red side, which means looking into `target` directly is not viable.
         * Instead, we need to implement a more crafty solution that looks into target's
         * own properties, or in the blue proto chain when needed.
         */
        set(
            shadowTarget: BlueShadowTarget,
            key: PropertyKey,
            value: BlueValue,
            receiver: BlueObject
        ): boolean {
            const { target } = this;
            const redDescriptor = ReflectGetOwnPropertyDescriptor(target, key);
            // There is currently no test in Locker or near-membrane-base that does NOT
            // evaluate to true in the following condition. However there ARE tests
            // in near-membrane-dom that evaluate to false and reach the else below
            //
            // istanbul ignore else
            if (redDescriptor === undefined) {
                // looking in the blue proto chain to avoid switching sides
                const blueProto = getBlueValue(ReflectGetPrototypeOf(target));
                // There is currently no test in Locker or near-membrane-* that reaches this
                // statement.
                //
                // istanbul ignore next
                if (blueProto !== null) {
                    return ReflectSet(blueProto, key, value, receiver);
                }
            } else if (ObjectHasOwnProperty(redDescriptor, 'set')) {
                // even though the setter function exists, we can't use Reflect.set because there
                // might be a distortion for that setter function, and from the blue side, we
                // should not be subject to those distortions.
                ReflectApply(getBlueValue(redDescriptor.set!), receiver, [value]);
                // if there is a callable setter, it either throw or we can assume the value was set
                return true;
            }
            // if it is not an accessor property, is either a getter only accessor
            // or a data property, in which case we use Reflect.set to set the value,
            // and no receiver is needed since it will simply set the data property or nothing
            //
            // There is currently no test in Locker or near-membrane-* that reaches this
            // statement.
            //
            // istanbul ignore next
            return ReflectSet(target, key, env.getRedValue(value));
        }

        // There is currently no test in Locker or near-membrane-* that exercises this trap.
        //
        // istanbul ignore next
        setPrototypeOf(shadowTarget: BlueShadowTarget, prototype: BlueValue): boolean {
            return ReflectSetPrototypeOf(this.target, env.getRedValue(prototype));
        }
    }
    ReflectSetPrototypeOf(BlueDynamicProxyHandler.prototype, null);
    // future optimization: hoping that proxies with frozen handlers can be faster
    ObjectFreeze(BlueDynamicProxyHandler.prototype);
    return getBlueValue;
}
