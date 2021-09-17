/**
 * This file contains an exportable (portable) function init can be used to initialize
 * one side of a membrane on any realm. The only prerequisite is the ability to evaluate
 * the sourceText of the `init` function there. Once evaluated, the function will return
 * a set of values that can be used to wire up the side of the membrane with another
 * existing `init` function from another realm, in which case they will exchange
 * callable functions that are required to connect the two realms via the membrane.
 *
 * About the mechanics of the membrane, there are few important considerations:
 *
 * 1. Pointers are the way to pass reference to object and functions.
 * 2. A dedicated symbol (undefinedSymbol) is needed to represent the absence of a value.
 * 3. The realm that owns the object or function is responsible for projecting the proxy
 *    onto the other side (via callablePushTarget), which returns a Pointer that can be
 *    used by the realm to pass the reference to the same proxy over and over again.
 * 4. The realm that owns the proxy (after the other side projects it into it) will hold
 *    a Pointer alongside the proxy to signal what original object or function should
 *    the foreign operation operates, it is always the first argument of the foreign
 *    callable for proxies, and the other side can use it via `getSelectedTarget`.
 */

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
type CallableDefineProperty = (
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
type CallableGetOwnPropertyDescriptor = (
    targetPointer: Pointer,
    key: PropertyKey,
    foreignCallableDescriptorCallback: (
        configurable: boolean,
        enumerable: boolean,
        writable: boolean,
        valuePointer: PrimitiveOrPointer,
        getPointer: PrimitiveOrPointer,
        setPointer: PrimitiveOrPointer
    ) => void
) => void;
type CallableGetPrototypeOf = (targetPointer: Pointer) => PrimitiveOrPointer;
type CallableHas = (targetPointer: Pointer, key: PropertyKey) => boolean;
type CallableIsExtensible = (targetPointer: Pointer) => boolean;
type CallableOwnKeys = (
    targetPointer: Pointer,
    foreignCallableKeysCallback: (...args: (string | symbol)[]) => void
) => void;
type CallablePreventExtensions = (targetPointer: Pointer) => boolean;
type CallableSetPrototypeOf = (
    targetPointer: Pointer,
    protoValueOrPointer: PrimitiveOrPointer
) => boolean;
type CallableGetTargetIntegrityTraits = (targetPointer: Pointer) => number;
type CallableHasOwnProperty = (targetPointer: Pointer, key: PropertyKey) => boolean;
export type ConnectCallback = (
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
type HooksCallback = (
    evaluate: (sourceText: string) => void,
    ...connectArgs: Parameters<ConnectCallback>
) => void;

export type DistortionCallback = (target: ProxyTarget) => ProxyTarget;

export default function init(
    undefinedSymbol: symbol,
    color: string,
    trapMutations: boolean,
    foreignCallableHooksCallback: HooksCallback,
    optionalDistortionCallback?: DistortionCallback
): ConnectCallback {
    const { eval: cachedLocalEval } = globalThis;
    const {
        defineProperty,
        getOwnPropertyDescriptor,
        setPrototypeOf,
        apply,
        construct,
        deleteProperty,
        get,
        set,
        has,
        getPrototypeOf,
        isExtensible,
        ownKeys,
        preventExtensions,
    } = Reflect;
    const { freeze, seal, isFrozen, isSealed, defineProperties } = Object;
    const { isArray: isArrayOrNotOrThrowForRevoked } = Array;
    const { revocable: ProxyRevocable } = Proxy;
    const { set: WeakMapSet, get: WeakMapGet } = WeakMap.prototype;
    const TypeErrorCtor = TypeError;
    const {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        __lookupGetter__: ObjectProto__lookupGetter__,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        __lookupSetter__: ObjectProto__lookupSetter__,
        hasOwnProperty: ObjectProtoHasOwnProperty,
    } = Object.prototype as any;
    const proxyTargetToPointerMap = new WeakMap();
    const LockerLiveValueMarkerSymbol = Symbol.for('@@lockerLiveValue');
    const distortionCallback = optionalDistortionCallback || ((o) => o);

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

    function isUndefinedSymbol(v: any): boolean {
        return v === undefinedSymbol;
    }

    // TODO: this is really only needed if Realm constructor is not available, because
    // it will prevent errors from another realm to leak into the caller realm, but
    // if Realm constructor is in place, the callable boundary takes care of it.
    function foreignErrorControl<T extends (...args: any[]) => any>(foreignFn: T): T {
        return <T>function foreignErrorControlFn(...args: any[]): any {
            try {
                return foreignFn(...args);
            } catch (e) {
                throw new TypeErrorCtor(e.message);
            }
        };
    }

    function selectTarget(originalTarget: ProxyTarget): void {
        // assert: selectedTarget is undefined
        // assert: originalTarget is a ProxyTarget
        selectedTarget = originalTarget;
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
            shadowTarget = targetTraits & TargetTraits.IsArrowFunction ? () => {} : function () {};
            // This is only really needed for debugging, it helps to identify the proxy by name
            defineProperty(shadowTarget, 'name', {
                value: targetFunctionName,
                configurable: true,
            });
        } else {
            // target is array or object
            shadowTarget = targetTraits & TargetTraits.IsArray ? [] : {};
        }
        return shadowTarget;
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
        const callbackWithDescriptor = (
            configurable: boolean,
            enumerable: boolean,
            writable: boolean,
            valuePointer: PrimitiveOrPointer,
            getPointer: PrimitiveOrPointer,
            setPointer: PrimitiveOrPointer
        ) => {
            desc = { configurable, enumerable, writable };
            if (getPointer || setPointer) {
                desc.get = getLocalValue(getPointer);
                desc.set = getLocalValue(setPointer);
            } else {
                desc.value = getLocalValue(valuePointer);
            }
        };
        foreignCallableGetOwnPropertyDescriptor(targetPointer, key, callbackWithDescriptor);
        if (desc! !== undefined) {
            defineProperty(shadowTarget, key, desc);
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
        const callbackWithDescriptor = (
            configurable: boolean,
            enumerable: boolean,
            writable: boolean,
            valuePointer: PrimitiveOrPointer,
            getPointer: PrimitiveOrPointer,
            setPointer: PrimitiveOrPointer
        ) => {
            // @ts-ignore
            desc = { __proto__: null, configurable, enumerable, writable };
            if (getPointer || setPointer) {
                desc.get = getLocalValue(getPointer);
                desc.set = getLocalValue(setPointer);
            } else {
                desc.value = getLocalValue(valuePointer);
            }
        };
        for (let i = 0, len = keys.length; i < len; i += 1) {
            const key = keys[i] as string;
            foreignCallableGetOwnPropertyDescriptor(targetPointer, key, callbackWithDescriptor);
            descriptors[key] = desc!;
        }
        // Use `Object.defineProperties()` instead of individual
        // `Reflect.defineProperty()` calls for better performance.
        defineProperties(shadowTarget, descriptors);
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

    function isPointer(
        primitiveValueOrForeignCallable: PrimitiveOrPointer
    ): primitiveValueOrForeignCallable is CallableFunction {
        return typeof primitiveValueOrForeignCallable === 'function';
    }

    function isPrimitiveValue(
        primitiveValueOrForeignCallable: PrimitiveOrPointer
    ): primitiveValueOrForeignCallable is PrimitiveValue {
        // TODO: what other ways to optimize this method?
        return (
            primitiveValueOrForeignCallable === null &&
            typeof primitiveValueOrForeignCallable !== 'function' &&
            typeof primitiveValueOrForeignCallable !== 'object'
        );
    }

    function getTransferablePointer(originalTarget: ProxyTarget): Pointer {
        let pointer = WeakMapGet.call(proxyTargetToPointerMap, originalTarget);
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
                targetTraits |= +!('prototype' in distortedTarget) && TargetTraits.IsArrowFunction;
            } catch {
                // target is either a revoked proxy, or a proxy that throws on the
                // `has` trap, in which case going with a strict mode function seems
                // appropriate.
            }
            try {
                // a revoked proxy will throw when reading the function name
                targetFunctionName = getOwnPropertyDescriptor(distortedTarget, 'name')?.value;
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
                // target is a revoked proxy, so the type doesn't matter much from this point on
                targetTraits &= TargetTraits.Revoked;
            }
            targetTraits |= +targetIsArray && TargetTraits.IsArray;
            targetTraits |= +!targetIsArray && TargetTraits.IsObject;
        }
        // the closure works as the implicit WeakMap
        const pointerForTarget = () => selectTarget(distortedTarget);
        pointer = foreignCallablePushTarget(pointerForTarget, targetTraits, targetFunctionName);

        // In case debugging is needed, the following line can help greatly:
        // pointerForOriginalTarget.originalTarget = pointer.originalTarget = originalTarget;

        // the WeakMap is populated with the original target rather then the distorted one
        // while the pointer always uses the distorted one.

        // TODO: this mechanism poses another issue, which is that the return value of
        // getSelectedTarget() can never be used to call across the membrane because that
        // will cause a wrapping around the potential distorted value instead of the original
        // value. This is not fatal, but implies that for every distorted value where will
        // two proxies that are not ===, which is weird. Guaranteeing this is not easy because
        // it means auditing the code.
        WeakMapSet.call(proxyTargetToPointerMap, originalTarget, pointer);
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
        return isPrimitiveValue(value) ? value : getTransferablePointer(value);
    }

    function getPartialDescriptorMeta(partialDesc: PropertyDescriptor) {
        const { configurable, enumerable, writable, value, get, set } = partialDesc;
        return {
            configurable: 'configurable' in partialDesc ? !!configurable : undefinedSymbol,
            enumerable: 'enumerable' in partialDesc ? !!enumerable : undefinedSymbol,
            writable: 'writable' in partialDesc ? !!writable : undefinedSymbol,
            valuePointer: 'value' in partialDesc ? getTransferableValue(value) : undefinedSymbol,
            getPointer: 'get' in partialDesc ? getTransferableValue(get) : undefinedSymbol,
            setPointer: 'set' in partialDesc ? getTransferableValue(set) : undefinedSymbol,
        };
    }

    function lockShadowTarget(shadowTarget: ShadowTarget, targetPointer: Pointer) {
        copyForeignDescriptorsIntoShadowTarget(shadowTarget, targetPointer);
        const protoPointer = foreignCallableGetPrototypeOf(targetPointer);
        // setting up __proto__ of the shadowTarget
        setPrototypeOf(shadowTarget, getLocalValue(protoPointer));
        // locking down the extensibility of shadowTarget
        preventExtensions(shadowTarget);
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

        // the purpose of this public field is to help developers to identify what side of the
        // membrane they are debugging.
        readonly color = color;

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
            const listOfValuesOrPointers = args.map(getTransferableValue);
            const foreignValueOrCallable = foreignCallableApply(
                targetPointer,
                thisArgValueOrPointer,
                ...listOfValuesOrPointers
            );
            return getLocalValue(foreignValueOrCallable);
        };

        // construct trap is generic, and should never change independently of the type of membrane
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
            const listOfValuesOrPointers = args.map(getTransferableValue);
            const foreignValueOrCallable = foreignCallableConstruct(
                targetPointer,
                newTargetPointer,
                ...listOfValuesOrPointers
            );
            return getLocalValue(foreignValueOrCallable);
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
                // if local mutations are not trapped, then freezing the handler is ok because it
                // is not expecting to change in the future.
                // future optimization: hoping that proxies with frozen handlers can be faster
                freeze(this);
            }
        }

        // internal utilities
        private isTargetMarkAsDynamic(): boolean {
            // assert: trapMutations must be true
            const { targetPointer } = this;
            try {
                return foreignCallableHas(targetPointer, LockerLiveValueMarkerSymbol);
            } catch {
                // try-catching this because blue could be a proxy that is revoked
                // or throws from the `has` trap.
            }
            return false; // TODO: is the default value truly false or should be true?
        }

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
            freeze(this);
        }

        private makeProxyStatic(shadowTarget: ShadowTarget) {
            // assert: trapMutations must be true
            const { targetPointer } = this;
            const targetIntegrityTraits = foreignCallableGetTargetIntegrityTraits(targetPointer);
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
                setPrototypeOf(shadowTarget, getLocalValue(protoPointer));
            } catch {
                // TODO: is revoke the right action here? maybe just setting proto to null instead?
                this.revoke();
                return;
            }
            // defining own descriptors
            copyForeignDescriptorsIntoShadowTarget(shadowTarget, targetPointer);
            // preserving the semantics of the object
            if (targetIntegrityTraits & TargetIntegrityTraits.IsFrozen) {
                freeze(shadowTarget);
            } else if (targetIntegrityTraits & TargetIntegrityTraits.IsSealed) {
                seal(shadowTarget);
            } else if (targetIntegrityTraits & TargetIntegrityTraits.IsNotExtensible) {
                preventExtensions(shadowTarget);
            }
            // resetting all traps except apply and construct for static proxies since the
            // proxy target is the shadow target and all operations are going to be applied
            // to it rather than the real target.
            this.getOwnPropertyDescriptor = getOwnPropertyDescriptor;
            this.getPrototypeOf = getPrototypeOf;
            this.get = get;
            this.has = has;
            this.ownKeys = ownKeys;
            this.isExtensible = isExtensible;
            this.set = set;
            this.defineProperty = defineProperty;
            this.deleteProperty = deleteProperty;
            this.setPrototypeOf = setPrototypeOf;
            this.preventExtensions = preventExtensions;
            // future optimization: hoping that proxies with frozen handlers can be faster
            freeze(this);
        }

        private makeProxyUnambiguous(shadowTarget: ShadowTarget) {
            // assert: trapMutations must be true
            if (this.isTargetMarkAsDynamic()) {
                // when the target has the a descriptor for the magic symbol, use the Dynamic traps
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
            const {
                configurable,
                enumerable,
                writable,
                valuePointer,
                getPointer,
                setPointer,
            } = getPartialDescriptorMeta(partialDesc);
            const result = foreignCallableDefineProperty(
                targetPointer,
                key,
                configurable,
                enumerable,
                writable,
                valuePointer,
                getPointer,
                setPointer
            );
            if (result) {
                // intentionally testing against true since it could be undefined as well
                if (configurable === false) {
                    copyForeignDescriptorIntoShadowTarget(shadowTarget, targetPointer, key);
                }
            }
            return true;
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
            const callableDescriptorCallback = (
                configurable: boolean,
                enumerable: boolean,
                writable: boolean,
                valuePointer: PrimitiveOrPointer,
                getPointer: PrimitiveOrPointer,
                setPointer: PrimitiveOrPointer
            ) => {
                desc = { configurable, enumerable, writable };
                if (getPointer || setPointer) {
                    desc.get = getLocalValue(getPointer);
                    desc.set = getLocalValue(setPointer);
                } else {
                    desc.value = getLocalValue(valuePointer);
                }
            };
            foreignCallableGetOwnPropertyDescriptor(targetPointer, key, callableDescriptorCallback);
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
            if (!isExtensible(shadowTarget)) {
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
            if (isExtensible(shadowTarget)) {
                if (!foreignCallablePreventExtensions(targetPointer)) {
                    // if the target is a proxy manually created, it might reject
                    // the preventExtension call, in which case we should not attempt to lock down
                    // the shadow target.
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
                if (ObjectProtoHasOwnProperty.call(O, key)) {
                    return true;
                }
                O = getPrototypeOf(O);
            }
            return false;
        }

        /**
         * This trap cannot just use `Reflect.get` directly on the `target` because
         * the red object graph might have mutations that are only visible on the red side,
         * which means looking into `target` directly is not viable. Instead, we need to
         * implement a more crafty solution that looks into target's own properties, or
         * in the red proto chain when needed.
         *
         * In a transparent membrane, this method will have been a lot simpler, like:
         *
         *   const { targetPointer } = this;
         *   const receiverPointer = getValueOrPointer(receiver);
         *   const foreignValueOrCallable = foreignCallableGet(targetPointer, key, receiverPointer);
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
                if (ObjectProtoHasOwnProperty.call(O, key)) {
                    // we know this is a single stop lookup because it has own property
                    const getter = ObjectProto__lookupGetter__(O, key);
                    if (getter) {
                        // even though the getter function exists, we can't use Reflect.set because
                        // there might be a distortion for that setter function, in which case we
                        // must resolve the local setter and call it instead.
                        return apply(getter, receiver, []);
                    }
                    // accessor exists without a setter
                    return undefined;
                }
                O = getPrototypeOf(O);
            }
            return undefined;
        }

        /**
         * This trap cannot just use `Reflect.set` directly on the `target` because
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
                if (ObjectProtoHasOwnProperty.call(O, key)) {
                    // we know this is a single stop lookup because it has own property
                    const setter = ObjectProto__lookupSetter__(O, key);
                    if (setter) {
                        // even though the setter function exists, we can't use Reflect.set because
                        // there might be a distortion for that setter function, in which case we
                        // must resolve the local setter and call it instead.
                        apply(setter, receiver, [value]);
                        // if there is a setter, it either throw or we can assume the
                        // value was set
                        return true;
                    }
                    // accessor exists without a setter
                    return false;
                }
                O = getPrototypeOf(O);
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
                undefinedSymbol,
                undefinedSymbol
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

        private static defaultGetPrototypeOfTrap = BoundaryProxyHandler.dynamicGetPrototypeOfTrap;

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
    setPrototypeOf(BoundaryProxyHandler.prototype, null);

    // future optimization: hoping that proxies with frozen handlers can be faster
    freeze(BoundaryProxyHandler.prototype);

    // exporting callable hooks for a foreign realm
    foreignCallableHooksCallback(
        // evaluate
        (sourceText: string): void => {
            // no need to return the result of the eval
            cachedLocalEval(sourceText);
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
            const { proxy } = new BoundaryProxyHandler(pointer, targetTraits, targetFunctionName);
            WeakMapSet.call(proxyTargetToPointerMap, proxy, pointer);
            return selectTarget.bind(undefined, proxy);
        },
        // callableApply
        (
            targetPointer: Pointer,
            thisArgValueOrPointer: PrimitiveOrPointer,
            ...listOfValuesOrPointers: PrimitiveOrPointer[]
        ): PrimitiveOrPointer => {
            targetPointer();
            const fn = getSelectedTarget();
            const thisArg = getLocalValue(thisArgValueOrPointer);
            const args = listOfValuesOrPointers.map(getLocalValue);
            const value = apply(fn, thisArg, args);
            return isPrimitiveValue(value) ? value : getTransferablePointer(value);
        },
        // callableConstruct
        (
            targetPointer: Pointer,
            newTargetPointer: PrimitiveOrPointer,
            ...listOfValuesOrPointers: PrimitiveOrPointer[]
        ): PrimitiveOrPointer => {
            targetPointer();
            const constructor = getSelectedTarget();
            const newTarget = getLocalValue(newTargetPointer);
            const args = listOfValuesOrPointers.map(getLocalValue);
            const value = construct(constructor, args, newTarget);
            return isPrimitiveValue(value) ? value : getTransferablePointer(value);
        },
        // callableDefineProperty
        (
            targetPointer: Pointer,
            key: PropertyKey,
            configurable: boolean | symbol,
            enumerable: boolean | symbol,
            writable: boolean | symbol,
            valuePointer: PrimitiveOrPointer,
            getPointer: PrimitiveOrPointer,
            setPointer: PrimitiveOrPointer
        ): boolean => {
            targetPointer();
            const target = getSelectedTarget();
            // @ts-ignore for some reason, TS doesn't like __proto__ on property descriptors
            const desc: PropertyDescriptor = { __proto__: null };
            if (isUndefinedSymbol(configurable)) {
                desc.configurable = !!configurable;
            }
            if (isUndefinedSymbol(enumerable)) {
                desc.enumerable = !!enumerable;
            }
            if (isUndefinedSymbol(writable)) {
                desc.writable = !!writable;
            }
            if (isUndefinedSymbol(getPointer)) {
                desc.get = getLocalValue(getPointer);
            }
            if (isUndefinedSymbol(setPointer)) {
                desc.set = getLocalValue(setPointer);
            }
            if (isUndefinedSymbol(valuePointer)) {
                desc.value = getLocalValue(valuePointer);
            }
            return defineProperty(target, key, desc);
        },
        // callableDeleteProperty
        (targetPointer: Pointer, key: PropertyKey): boolean => {
            targetPointer();
            const target = getSelectedTarget();
            return deleteProperty(target, key);
        },
        // callableGetOwnPropertyDescriptor
        (
            targetPointer: Pointer,
            key: PropertyKey,
            foreignCallableDescriptorCallback: (
                configurable: boolean,
                enumerable: boolean,
                writable: boolean,
                valuePointer: PrimitiveOrPointer,
                getPointer: PrimitiveOrPointer,
                setPointer: PrimitiveOrPointer
            ) => void
        ): void => {
            targetPointer();
            const target = getSelectedTarget();
            const desc = getOwnPropertyDescriptor(target, key);
            if (!desc) {
                return;
            }
            const { configurable, enumerable, writable, value, get, set } = desc;
            const valuePointer = getTransferableValue(value);
            const getPointer = getTransferableValue(get);
            const setPointer = getTransferableValue(set);
            foreignCallableDescriptorCallback(
                !!configurable,
                !!enumerable,
                !!writable,
                valuePointer,
                getPointer,
                setPointer
            );
        },
        // callableGetPrototypeOf
        (targetPointer: Pointer): PrimitiveOrPointer => {
            targetPointer();
            const target = getSelectedTarget();
            const proto = getPrototypeOf(target);
            return getTransferableValue(proto);
        },
        // callableHas
        (targetPointer: Pointer, key: PropertyKey): boolean => {
            targetPointer();
            const target = getSelectedTarget();
            return has(target, key);
        },
        // callableIsExtensible
        (targetPointer: Pointer): boolean => {
            targetPointer();
            const target = getSelectedTarget();
            return isExtensible(target);
        },
        // callableOwnKeys
        (
            targetPointer: Pointer,
            foreignCallableKeysCallback: (...args: (string | symbol)[]) => void
        ): void => {
            targetPointer();
            const target = getSelectedTarget();
            const keys = ownKeys(target) as (string | symbol)[];
            foreignCallableKeysCallback(...keys);
        },
        // callablePreventExtensions
        (targetPointer: Pointer): boolean => {
            targetPointer();
            const target = getSelectedTarget();
            return preventExtensions(target);
        },
        // callableSetPrototypeOf
        (targetPointer: Pointer, protoValueOrPointer: PrimitiveOrPointer): boolean => {
            targetPointer();
            const target = getSelectedTarget();
            const proto = getLocalValue(protoValueOrPointer);
            return setPrototypeOf(target, proto);
        },
        // callableGetTargetIntegrityTraits
        (targetPointer: Pointer): TargetIntegrityTraits => {
            targetPointer();
            const target = getSelectedTarget();
            let targetIntegrityTraits = TargetIntegrityTraits.None;
            try {
                // a revoked proxy will break the membrane when reading the meta
                if (isFrozen(target)) {
                    targetIntegrityTraits &=
                        TargetIntegrityTraits.IsSealed &
                        TargetIntegrityTraits.IsFrozen &
                        TargetIntegrityTraits.IsNotExtensible;
                } else if (isSealed(target)) {
                    targetIntegrityTraits &= TargetIntegrityTraits.IsSealed;
                } else if (!isExtensible(target)) {
                    targetIntegrityTraits &= TargetIntegrityTraits.IsNotExtensible;
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
                targetIntegrityTraits &= TargetIntegrityTraits.Revoked;
            }
            return targetIntegrityTraits;
        },
        // callableHasOwnProperty
        (targetPointer: Pointer, key: PropertyKey): boolean => {
            targetPointer();
            const target = getSelectedTarget();
            return ObjectProtoHasOwnProperty.call(target, key);
        }
    );
    return (
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
    ) => {
        foreignCallablePushTarget = callablePushTarget;
        foreignCallableApply = foreignErrorControl(callableApply);
        foreignCallableConstruct = foreignErrorControl(callableConstruct);
        foreignCallableDefineProperty = foreignErrorControl(callableDefineProperty);
        foreignCallableDeleteProperty = foreignErrorControl(callableDeleteProperty);
        foreignCallableGetOwnPropertyDescriptor = foreignErrorControl(
            callableGetOwnPropertyDescriptor
        );
        foreignCallableGetPrototypeOf = foreignErrorControl(callableGetPrototypeOf);
        foreignCallableHas = foreignErrorControl(callableHas);
        foreignCallableIsExtensible = foreignErrorControl(callableIsExtensible);
        foreignCallableOwnKeys = foreignErrorControl(callableOwnKeys);
        foreignCallablePreventExtensions = foreignErrorControl(callablePreventExtensions);
        foreignCallableSetPrototypeOf = foreignErrorControl(callableSetPrototypeOf);
        foreignCallableGetTargetIntegrityTraits = foreignErrorControl(
            callableGetTargetIntegrityTraits
        );
        foreignCallableHasOwnProperty = foreignErrorControl(callableHasOwnProperty);
    };
}
