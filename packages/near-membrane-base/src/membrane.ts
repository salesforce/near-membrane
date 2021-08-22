export type Pointer = () => void;
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
type CallableGet = (
    targetPointer: Pointer,
    key: PropertyKey,
    receiverPointer: PrimitiveOrPointer
) => PrimitiveOrPointer;
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
type CallableSet = (
    targetPointer: Pointer,
    key: PropertyKey,
    valuePointer: PrimitiveOrPointer,
    receiverPointer: PrimitiveOrPointer
) => boolean;
type CallableSetPrototypeOf = (
    targetPointer: Pointer,
    protoValueOrPointer: PrimitiveOrPointer
) => boolean;
type CallableGetTargetIntegrityTraits = (targetPointer: Pointer) => number;
type CallableHasOwnProperty = (targetPointer: Pointer, key: PropertyKey) => boolean;
export type ConnectCallback = (
    pushTarget: CallablePushTarget,
    callableApply: CallableApply,
    callableConstruct: CallableConstruct,
    callableDefineProperty: CallableDefineProperty,
    callableDeleteProperty: CallableDeleteProperty,
    callableGet: CallableGet,
    callableGetOwnPropertyDescriptor: CallableGetOwnPropertyDescriptor,
    callableGetPrototypeOf: CallableGetPrototypeOf,
    callableHas: CallableHas,
    callableIsExtensible: CallableIsExtensible,
    callableOwnKeys: CallableOwnKeys,
    callablePreventExtensions: CallablePreventExtensions,
    callableSet: CallableSet,
    callableSetPrototypeOf: CallableSetPrototypeOf,
    callableGetTargetIntegrityTraits: CallableGetTargetIntegrityTraits,
    callableHasOwnProperty: CallableHasOwnProperty
) => void;
type HooksCallback = (
    exportValues: () => Pointer,
    getRef: () => ProxyTarget,
    ...connectArgs: Parameters<ConnectCallback>
) => void;

export default function init(
    undefinedSymbol: symbol,
    color: string,
    trapMutations: boolean,
    foreignCallableHooksCallback: HooksCallback
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
    const { freeze, create, seal, isFrozen, isSealed, defineProperties, hasOwnProperty } = Object;
    const { isArray: isArrayOrNotOrThrowForRevoked } = Array;
    const { revocable: ProxyRevocable } = Proxy;
    const { set: WeakMapSet, get: WeakMapGet } = WeakMap.prototype;
    const TypeErrorCtor = TypeError;
    const proxyTargetToPointerMap = new WeakMap();
    const LockerLiveValueMarkerSymbol = Symbol.for('@@lockerLiveValue');

    let selectedTarget: undefined | ProxyTarget;
    let foreignPushTarget: CallablePushTarget;
    let foreignCallableApply: CallableApply;
    let foreignCallableConstruct: CallableConstruct;
    let foreignCallableDefineProperty: CallableDefineProperty;
    let foreignCallableDeleteProperty: CallableDeleteProperty;
    let foreignCallableGet: CallableGet;
    let foreignCallableGetOwnPropertyDescriptor: CallableGetOwnPropertyDescriptor;
    let foreignCallableGetPrototypeOf: CallableGetPrototypeOf;
    let foreignCallableHas: CallableHas;
    let foreignCallableIsExtensible: CallableIsExtensible;
    let foreignCallableOwnKeys: CallableOwnKeys;
    let foreignCallablePreventExtensions: CallablePreventExtensions;
    let foreignCallableSet: CallableSet;
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

    function foreignErrorControl<T>(foreignFn: T): T {
        return (...args) => {
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
        const descriptors = create(null);
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
        for (let i = 0, len = keys.length; i < len; i += 1) {
            const key = keys[i] as string;
            foreignCallableGetOwnPropertyDescriptor(targetPointer, key, callbackWithDescriptor);
            descriptors[key] = desc!;
        }
        // Use `Object.defineProperties()` instead of individual
        // `Reflect.defineProperty()` calls for better performance.
        defineProperties(shadowTarget, descriptors);
    }

    function isPointer(
        primitiveValueOrForeignCallable: PrimitiveOrPointer
    ): primitiveValueOrForeignCallable is CallableFunction {
        return typeof primitiveValueOrForeignCallable === 'function';
    }

    function isPrimitiveValue(
        primitiveValueOrForeignCallable: PrimitiveOrPointer
    ): primitiveValueOrForeignCallable is PrimitiveValue {
        return (
            typeof primitiveValueOrForeignCallable !== 'function' &&
            typeof primitiveValueOrForeignCallable !== 'object'
        );
    }

    function getPointer(originalTarget: ProxyTarget): Pointer {
        let pointer = WeakMapGet.call(proxyTargetToPointerMap, originalTarget);
        if (pointer) {
            return pointer;
        }
        // extracting the metadata about the proxy target
        let targetTraits = TargetTraits.None;
        let targetFunctionName: string | undefined;
        if (typeof originalTarget === 'function') {
            targetTraits |= TargetTraits.IsFunction;
            // detecting arrow function vs function
            try {
                targetTraits |= +!('prototype' in originalTarget) && TargetTraits.IsArrowFunction;
            } catch {
                // target is either a revoked proxy, or a proxy that throws on the
                // `has` trap, in which case going with a strict mode function seems
                // appropriate.
            }
            try {
                // a revoked proxy will throw when reading the function name
                targetFunctionName = getOwnPropertyDescriptor(originalTarget, 'name')?.value;
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
                targetIsArray = isArrayOrNotOrThrowForRevoked(originalTarget);
            } catch {
                // target is a revoked proxy, so the type doesn't matter much from this point on
                targetTraits &= TargetTraits.Revoked;
            }
            targetTraits |= +targetIsArray && TargetTraits.IsArray;
            targetTraits |= +!targetIsArray && TargetTraits.IsObject;
        }
        // the closure works as the implicit WeakMap
        const pointerForOriginalTarget = () => selectTarget(originalTarget);
        pointer = foreignPushTarget(pointerForOriginalTarget, targetTraits, targetFunctionName);
        // In case debugging is needed, the following line can help greatly:
        // pointerForOriginalTarget.originalTarget = pointer.originalTarget = originalTarget;
        WeakMapSet.call(proxyTargetToPointerMap, originalTarget, pointer);
        return pointer;
    }

    function getLocalValue(primitiveValueOrForeignCallable: PrimitiveOrPointer): any {
        if (isPointer(primitiveValueOrForeignCallable)) {
            primitiveValueOrForeignCallable();
            return getSelectedTarget();
        }
        return primitiveValueOrForeignCallable;
    }

    function getValueOrPointer(value: any): PrimitiveOrPointer {
        return isPrimitiveValue(value) ? value : getPointer(value);
    }

    function getPartialDescriptorMeta(partialDesc: PropertyDescriptor) {
        const { configurable, enumerable, writable, value, get, set } = partialDesc;
        return {
            configurable: 'configurable' in partialDesc ? !!configurable : undefinedSymbol,
            enumerable: 'enumerable' in partialDesc ? !!enumerable : undefinedSymbol,
            writable: 'writable' in partialDesc ? !!writable : undefinedSymbol,
            valuePointer: 'value' in partialDesc ? getValueOrPointer(value) : undefinedSymbol,
            getPointer: 'get' in partialDesc ? getValueOrPointer(get) : undefinedSymbol,
            setPointer: 'set' in partialDesc ? getValueOrPointer(set) : undefinedSymbol,
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

    class BoundaryProxyHandler<T> implements ProxyHandler<ShadowTarget> {
        // callback to prepare the foreign realm before any operation
        private readonly targetPointer: Pointer;

        readonly apply = this.applyTrap;

        readonly construct = this.constructTrap;

        readonly color = color;

        ownKeys = this.dynamicOwnKeysTrap;

        isExtensible = this.dynamicIsExtensibleTrap;

        getOwnPropertyDescriptor = this.dynamicGetOwnPropertyDescriptorTrap;

        getPrototypeOf = this.dynamicGetPrototypeOfTrap;

        // local graph dynamic traps are only really needed if this membrane
        // traps mutations to avoid mutations operations on the
        // side of the membrane.
        // TODO: find a way to optimize the declaration rather than instantiation
        get = trapMutations ? this.localGraphDynamicGetTrap : this.dynamicGetTrap;

        has = trapMutations ? this.localGraphDynamicHasTrap : this.dynamicHasTrap;

        // pending traps are only really needed if this membrane
        // traps mutations to avoid mutations operations on the
        // side of the membrane.
        // TODO: find a way to optimize the declaration rather than instantiation
        setPrototypeOf = trapMutations
            ? this.pendingSetPrototypeOfTrap
            : this.dynamicSetPrototypeOfTrap;

        set = trapMutations ? this.pendingSetTrap : this.dynamicSetTrap;

        deleteProperty = trapMutations
            ? this.pendingDeletePropertyTrap
            : this.dynamicDeletePropertyTrap;

        preventExtensions = trapMutations
            ? this.pendingPreventExtensionsTrap
            : this.dynamicPreventExtensionsTrap;

        defineProperty = trapMutations
            ? this.pendingDefinePropertyTrap
            : this.dynamicDefinePropertyTrap;

        constructor(
            targetPointer: Pointer,
            targetTraits: TargetTraits,
            targetFunctionName: string | undefined
        ) {
            this.targetPointer = targetPointer;
            // future optimization: hoping that proxies with frozen handlers can be faster
            freeze(this);
            const shadowTarget = createShadowTarget(targetTraits, targetFunctionName);
            const { proxy, revoke } = this.createRevocableProxy(shadowTarget);
            this.revoke = revoke;
            if (targetTraits & TargetTraits.Revoked) {
                revoke();
            }
            return proxy;
        }

        // generic traps
        private applyTrap(_shadowTarget: ShadowTarget, thisArg: any, args: any[]): any {
            const { targetPointer } = this;
            const thisArgValueOrPointer = getValueOrPointer(thisArg);
            const listOfValuesOrPointers = args.map(getValueOrPointer);
            const foreignValueOrCallable = foreignCallableApply(
                targetPointer,
                thisArgValueOrPointer,
                ...listOfValuesOrPointers
            );
            return getLocalValue(foreignValueOrCallable);
        }

        private constructTrap(_shadowTarget: ShadowTarget, args: any[], newTarget: any): any {
            const { targetPointer } = this;
            if (newTarget === undefined) {
                throw new TypeErrorCtor();
            }
            const newTargetPointer = getValueOrPointer(newTarget);
            const listOfValuesOrPointers = args.map(getValueOrPointer);
            const foreignValueOrCallable = foreignCallableConstruct(
                targetPointer,
                newTargetPointer,
                ...listOfValuesOrPointers
            );
            return getLocalValue(foreignValueOrCallable);
        }

        // dynamic traps
        private dynamicDefinePropertyTrap(
            shadowTarget: ShadowTarget,
            key: PropertyKey,
            partialDesc: PropertyDescriptor
        ): boolean {
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

        private dynamicDeletePropertyTrap(_shadowTarget: ShadowTarget, key: PropertyKey): boolean {
            const { targetPointer } = this;
            return foreignCallableDeleteProperty(targetPointer, key);
        }

        private dynamicGetTrap(_shadowTarget: ShadowTarget, key: PropertyKey, receiver: any): any {
            const { targetPointer } = this;
            const receiverPointer = getValueOrPointer(receiver);
            const foreignValueOrCallable = foreignCallableGet(targetPointer, key, receiverPointer);
            return getLocalValue(foreignValueOrCallable);
        }

        private dynamicGetOwnPropertyDescriptorTrap(
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

        private dynamicGetPrototypeOfTrap(_shadowTarget: ShadowTarget): any {
            const { targetPointer } = this;
            const protoPointer = foreignCallableGetPrototypeOf(targetPointer);
            return getLocalValue(protoPointer);
        }

        private dynamicHasTrap(_shadowTarget: ShadowTarget, key: PropertyKey): boolean {
            const { targetPointer } = this;
            return foreignCallableHas(targetPointer, key);
        }

        private dynamicIsExtensibleTrap(shadowTarget: ShadowTarget): boolean {
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

        private dynamicOwnKeysTrap(_shadowTarget: ShadowTarget): ArrayLike<string | symbol> {
            const { targetPointer } = this;
            let keys: ArrayLike<string | symbol> = [];
            const callableKeysCallback = (...args: (string | symbol)[]) => {
                keys = args;
            };
            foreignCallableOwnKeys(targetPointer, callableKeysCallback);
            return keys;
        }

        private dynamicPreventExtensionsTrap(shadowTarget: ShadowTarget): boolean {
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

        private dynamicSetTrap(
            _shadowTarget: ShadowTarget,
            key: PropertyKey,
            value: any,
            receiver: any
        ): boolean {
            const { targetPointer } = this;
            const valuePointer = getValueOrPointer(value);
            const receiverPointer = getValueOrPointer(receiver);
            return foreignCallableSet(targetPointer, key, valuePointer, receiverPointer);
        }

        private dynamicSetPrototypeOfTrap(_shadowTarget: ShadowTarget, prototype: any): boolean {
            const { targetPointer } = this;
            const protoValueOrPointer = getValueOrPointer(prototype);
            return foreignCallableSetPrototypeOf(targetPointer, protoValueOrPointer);
        }

        // static traps

        // pending traps
        private pendingSetPrototypeOfTrap(shadowTarget: ShadowTarget, prototype: any): boolean {
            // assert: trapMutations must be true
            this.makeProxyUnambiguous(shadowTarget);
            return this.setPrototypeOf(shadowTarget, prototype);
        }

        private pendingSetTrap(
            shadowTarget: ShadowTarget,
            key: PropertyKey,
            value: any,
            receiver: any
        ): boolean {
            // assert: trapMutations must be true
            this.makeProxyUnambiguous(shadowTarget);
            return this.set(shadowTarget, key, value, receiver);
        }

        private pendingDeletePropertyTrap(shadowTarget: ShadowTarget, key: PropertyKey): boolean {
            // assert: trapMutations must be true
            this.makeProxyUnambiguous(shadowTarget);
            return this.deleteProperty(shadowTarget, key);
        }

        private pendingPreventExtensionsTrap(shadowTarget: ShadowTarget): boolean {
            // assert: trapMutations must be true
            this.makeProxyUnambiguous(shadowTarget);
            return this.preventExtensions(shadowTarget);
        }

        private pendingDefinePropertyTrap(
            shadowTarget: ShadowTarget,
            key: PropertyKey,
            partialDesc: PropertyDescriptor
        ): boolean {
            // assert: trapMutations must be true
            this.makeProxyUnambiguous(shadowTarget);
            return this.defineProperty(shadowTarget, key, partialDesc);
        }

        /**
         * This trap cannot just use `Reflect.get` directly on the `target` because
         * the red object graph might have mutations that are only visible on the red side,
         * which means looking into `target` directly is not viable. Instead, we need to
         * implement a more crafty solution that looks into target's own properties, or
         * in the red proto chain when needed.
         */
        private localGraphDynamicGetTrap(
            _shadowTarget: ShadowTarget,
            key: PropertyKey,
            receiver: any
        ): any {
            // assert: trapMutations must be true
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
            const { targetPointer } = this;
            if (!foreignCallableHasOwnProperty(targetPointer, key)) {
                // TODO: the following line is from red.ts, and I believe it is incorrect:
                // looking in the foreign proto chain in case the proto chain has being mutated
                const protoPointer = foreignCallableGetPrototypeOf(targetPointer);
                if (protoPointer === null) {
                    return undefined;
                }
                const proto = getLocalValue(protoPointer);
                return get(proto, key, receiver);
            }
            let ownGetterPointer;
            const callbackWithDescriptor = (
                _configurable: boolean,
                _enumerable: boolean,
                _writable: boolean,
                _valuePointer: PrimitiveOrPointer,
                getPointer: PrimitiveOrPointer,
                _setPointer: PrimitiveOrPointer
            ) => {
                ownGetterPointer = getPointer;
            };
            foreignCallableGetOwnPropertyDescriptor(targetPointer, key, callbackWithDescriptor);
            if (ownGetterPointer) {
                // Knowing that it is an own getter, we can't still not use Reflect.get
                // because there might be a distortion for such getter, in which case we
                // must get the local getter, and call it.
                return apply(getLocalValue(ownGetterPointer), receiver, []);
            }
            // if it is not an accessor property, is either a setter only accessor
            // or a data property, in which case we could return undefined or the local value
            return foreignCallableGet(targetPointer, key, undefined);
        }

        /**
         * This trap cannot just use `Reflect.set` directly on the `target` because
         * the red object graph might have mutations that are only visible on the red side,
         * which means looking into `target` directly is not viable. Instead, we need to
         * implement a more crafty solution that looks into target's own properties, or
         * in the red proto chain when needed.
         */
        private localGraphDynamicSetTrap(
            _shadowTarget: ShadowTarget,
            key: PropertyKey,
            value: any,
            receiver: any
        ): boolean {
            // assert: trapMutations must be true
            const { targetPointer } = this;
            if (!foreignCallableHasOwnProperty(targetPointer, key)) {
                // TODO: the following line is from red.ts, and I believe it is incorrect:
                // looking in the foreign proto chain in case the proto chain has being mutated
                const protoPointer = foreignCallableGetPrototypeOf(targetPointer);
                if (protoPointer === null) {
                    return false;
                }
                const proto = getLocalValue(protoPointer);
                return set(proto, key, value, receiver);
            }
            let ownSetterPointer;
            const callbackWithDescriptor = (
                _configurable: boolean,
                _enumerable: boolean,
                _writable: boolean,
                _valuePointer: PrimitiveOrPointer,
                _getPointer: PrimitiveOrPointer,
                setPointer: PrimitiveOrPointer
            ) => {
                ownSetterPointer = setPointer;
            };
            foreignCallableGetOwnPropertyDescriptor(targetPointer, key, callbackWithDescriptor);
            if (ownSetterPointer) {
                // even though the setter function exists, we can't use Reflect.set because
                // there might be a distortion for that setter function, in which case we
                // must resolve the local setter and call it instead.
                apply(getLocalValue(ownSetterPointer), receiver, [value]);
                // if there is a callable setter, it either throw or we can assume the
                // value was set
                return true;
            }
            // if it is not an accessor property, is either a getter only accessor
            // or a data property, in which case we use Reflect.set to set the value,
            // and no receiver is needed since it will simply set the data property or nothing
            const valuePointer = getValueOrPointer(value);
            return foreignCallableSet(targetPointer, key, valuePointer, undefined);
        }

        /**
         * This trap cannot just use `Reflect.has` or the `in` operator directly because
         * the red object graph might have mutations that are only visible on the red side,
         * which means looking into `target` directly is not viable. Instead, we need to
         * implement a more crafty solution that looks into target's own properties, or
         * in the red proto chain when needed.
         */
        private localGraphDynamicHasTrap(_shadowTarget: ShadowTarget, key: PropertyKey): boolean {
            // assert: trapMutations must be true
            const { targetPointer } = this;
            if (foreignCallableHasOwnProperty(targetPointer, key)) {
                return true;
            }
            // TODO: the following line is from red.ts, and I believe it is incorrect:
            // looking in the foreign proto chain in case the proto chain has being mutated
            const protoPointer = foreignCallableGetPrototypeOf(targetPointer);
            if (protoPointer === null) {
                return false;
            }
            const proto = getLocalValue(protoPointer);
            return has(proto, key);
        }

        // internal utilities
        private revoke: () => void;

        private createRevocableProxy(shadowTarget: ShadowTarget): Proxy<T> {
            // in case we need this to revoke the proxy in the future
            const { proxy, revoke } = ProxyRevocable<T>(shadowTarget, this);
            this.revoke = revoke;
            return proxy;
        }

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

        private makeProxyDynamic(_shadowTarget: ShadowTarget) {
            // assert: trapMutations must be true
            // replacing pending traps with dynamic traps that can work with the target
            // without taking snapshots.
            this.set = this.localGraphDynamicSetTrap;
            this.deleteProperty = this.dynamicDeletePropertyTrap;
            this.setPrototypeOf = this.dynamicSetPrototypeOfTrap;
            this.preventExtensions = this.dynamicPreventExtensionsTrap;
            this.defineProperty = this.dynamicDefinePropertyTrap;
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
                this.makeProxyDynamic(shadowTarget);
            } else {
                this.makeProxyStatic(shadowTarget);
            }
        }
    }
    setPrototypeOf(BoundaryProxyHandler.prototype, null);

    // future optimization: hoping that proxies with frozen handlers can be faster
    freeze(BoundaryProxyHandler.prototype);

    // exporting callable hooks
    foreignCallableHooksCallback(
        // exportValues
        () =>
            getPointer({
                globalThis,
                indirectEval: (sourceText: string) => cachedLocalEval(sourceText),
                importModule: (specifier: string) => import(specifier),
            }),
        getSelectedTarget,
        // pushTarget
        (
            pointer: () => void,
            targetTraits: TargetTraits,
            targetFunctionName: string | undefined
        ): Pointer => {
            const proxy = new BoundaryProxyHandler(pointer, targetTraits, targetFunctionName);
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
            return isPrimitiveValue(value) ? value : getPointer(value);
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
            return isPrimitiveValue(value) ? value : getPointer(value);
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
            const desc = create(null);
            if (configurable !== undefinedSymbol) {
                desc.configurable = configurable;
            }
            if (enumerable !== undefinedSymbol) {
                desc.enumerable = enumerable;
            }
            if (writable !== undefinedSymbol) {
                desc.writable = writable;
            }
            if (getPointer !== undefinedSymbol) {
                desc.get = getLocalValue(getPointer);
            }
            if (setPointer !== undefinedSymbol) {
                desc.set = getLocalValue(setPointer);
            }
            if (valuePointer !== undefinedSymbol) {
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
        // callableGet
        (
            targetPointer: Pointer,
            key: PropertyKey,
            receiverPointer: PrimitiveOrPointer
        ): PrimitiveOrPointer => {
            targetPointer();
            const target = getSelectedTarget();
            const receiver = getLocalValue(receiverPointer);
            const value = get(target, key, receiver);
            return isPrimitiveValue(value) ? value : getPointer(value);
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
            const valuePointer = getValueOrPointer(value);
            const getPointer = getValueOrPointer(get);
            const setPointer = getValueOrPointer(set);
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
            return getValueOrPointer(proto);
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
            const keys = ownKeys(target);
            foreignCallableKeysCallback(...keys);
        },
        // callablePreventExtensions
        (targetPointer: Pointer): boolean => {
            targetPointer();
            const target = getSelectedTarget();
            return preventExtensions(target);
        },
        // callableSet
        (
            targetPointer: Pointer,
            key: PropertyKey,
            valuePointer: PrimitiveOrPointer,
            receiverPointer: PrimitiveOrPointer
        ): boolean => {
            targetPointer();
            const target = getSelectedTarget();
            const value = getLocalValue(valuePointer);
            const receiver = getLocalValue(receiverPointer);
            return set(target, key, value, receiver);
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
            return hasOwnProperty.call(target, key);
        }
    );
    return (
        pushTarget: CallablePushTarget,
        callableApply: CallableApply,
        callableConstruct: CallableConstruct,
        callableDefineProperty: CallableDefineProperty,
        callableDeleteProperty: CallableDeleteProperty,
        callableGet: CallableGet,
        callableGetOwnPropertyDescriptor: CallableGetOwnPropertyDescriptor,
        callableGetPrototypeOf: CallableGetPrototypeOf,
        callableHas: CallableHas,
        callableIsExtensible: CallableIsExtensible,
        callableOwnKeys: CallableOwnKeys,
        callablePreventExtensions: CallablePreventExtensions,
        callableSet: CallableSet,
        callableSetPrototypeOf: CallableSetPrototypeOf,
        callableGetTargetIntegrityTraits: CallableGetTargetIntegrityTraits,
        callableHasOwnProperty: CallableHasOwnProperty
    ) => {
        foreignPushTarget = pushTarget;
        foreignCallableApply = foreignErrorControl(callableApply);
        foreignCallableConstruct = foreignErrorControl(callableConstruct);
        foreignCallableDefineProperty = foreignErrorControl(callableDefineProperty);
        foreignCallableDeleteProperty = foreignErrorControl(callableDeleteProperty);
        foreignCallableGet = foreignErrorControl(callableGet);
        foreignCallableGetOwnPropertyDescriptor = foreignErrorControl(
            callableGetOwnPropertyDescriptor
        );
        foreignCallableGetPrototypeOf = foreignErrorControl(callableGetPrototypeOf);
        foreignCallableHas = foreignErrorControl(callableHas);
        foreignCallableIsExtensible = foreignErrorControl(callableIsExtensible);
        foreignCallableOwnKeys = foreignErrorControl(callableOwnKeys);
        foreignCallablePreventExtensions = foreignErrorControl(callablePreventExtensions);
        foreignCallableSet = foreignErrorControl(callableSet);
        foreignCallableSetPrototypeOf = foreignErrorControl(callableSetPrototypeOf);
        foreignCallableGetTargetIntegrityTraits = foreignErrorControl(
            callableGetTargetIntegrityTraits
        );
        foreignCallableHasOwnProperty = foreignErrorControl(callableHasOwnProperty);
    };
}
