import createVirtualEnvironment from '@locker/near-membrane-dom';

// W-23552746: `[[DefineOwnProperty]]` of an ACCESSOR descriptor on a live target
// must be scoped to the shadow target. A live proxy's `defineProperty` trap is
// otherwise passthru, so an accessor defined from inside the sandbox would plant
// a sandbox-authored getter/setter directly onto the RAW host-shared object.
// Because those functions are marshalled as pointers back into the sandbox, a
// later access from the primary realm (a confused deputy reading the planted
// key) would execute sandbox code with the RAW object as receiver and read
// raw-global-only state through it. The fix routes accessor descriptors on live
// targets to the shadow target only. The observable contract mirrors the
// `setPrototypeOf` fix (W-23623814):
//
//   1. An accessor defined from inside the sandbox is inert: the RAW target
//      never gains the getter/setter, and — because a live `get` resolves
//      against the RAW target — the sandbox reads back `undefined` too.
//   2. DATA descriptors remain passthru: an expando defined from the sandbox
//      still flows to the RAW target (the capability live targets need).
//   3. The other live traps (set, deleteProperty, preventExtensions) and
//      indexed writes are untouched: live targets keep their mutability.

const LOCKER_LIVE_VALUE_MARKER_SYMBOL = Symbol.for('@@lockerLiveValue');

function markLive(object) {
    Reflect.defineProperty(object, LOCKER_LIVE_VALUE_MARKER_SYMBOL, {});
    return object;
}

function createLiveEnvironment(extraEndowments) {
    return createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors(Object.assign({ expect }, extraEndowments)),
        liveTargetCallback(target) {
            return Object.hasOwn(target, LOCKER_LIVE_VALUE_MARKER_SYMBOL);
        },
    });
}

describe('defineProperty accessor isolation on live targets', () => {
    describe('the accessor is scoped to the shadow target (no callback on the raw object)', () => {
        it('does not plant a getter on the raw target via Object.defineProperty', () => {
            expect.assertions(4);

            const liveTarget = markLive({});
            const env = createLiveEnvironment({ liveTarget });

            env.evaluate(`
                let getterRan = false;
                // Define an accessor on the live target. defineProperty returns
                // true because the shadow target accepts it, but the accessor is
                // contained there.
                const ok = Object.defineProperty(liveTarget, 'pwned', {
                    configurable: true,
                    get() {
                        getterRan = true;
                        return 'SANDBOX_GETTER';
                    },
                });
                expect(ok).toBe(liveTarget);
                // A live get resolves against the RAW target, which never gained
                // the accessor, so the sandbox reads back undefined and the
                // getter never runs.
                expect(liveTarget.pwned).toBe(undefined);
                expect(getterRan).toBe(false);
            `);

            // Host side: the raw target never gained the accessor, so a read
            // from the primary realm executes no sandbox code.
            const rawDesc = Reflect.getOwnPropertyDescriptor(liveTarget, 'pwned');
            expect(rawDesc).toBe(undefined);
        });

        it('does not plant a setter on the raw target via Reflect.defineProperty', () => {
            expect.assertions(3);

            const liveTarget = markLive({});
            const env = createLiveEnvironment({ liveTarget });

            env.evaluate(`
                let setterRan = false;
                const ok = Reflect.defineProperty(liveTarget, 'sink', {
                    configurable: true,
                    set(value) {
                        setterRan = true;
                    },
                });
                expect(ok).toBe(true);
                // Writing the key from the sandbox routes through the live set
                // trap to the raw target; the shadow-scoped setter never runs.
                liveTarget.sink = 'ignored';
                expect(setterRan).toBe(false);
            `);

            const rawDesc = Reflect.getOwnPropertyDescriptor(liveTarget, 'sink');
            expect(rawDesc && rawDesc.set).toBe(undefined);
        });

        it('does not run a sandbox getter when the host reads the planted key (confused deputy)', () => {
            expect.assertions(2);

            const liveTarget = markLive({});
            const env = createLiveEnvironment({ liveTarget });

            env.evaluate(`
                Object.defineProperty(liveTarget, 'stolen', {
                    configurable: true,
                    get() {
                        // If this ever runs on the host with the raw receiver,
                        // it would be the confused deputy. It must never run
                        // outside the sandbox.
                        return 'SANDBOX_CODE_RAN_ON_HOST';
                    },
                });
                expect(liveTarget.stolen).toBe(undefined);
            `);

            // Host reads the planted key. No sandbox getter exists on the raw
            // object, so this is inert and never returns the sandbox sentinel.
            expect(liveTarget.stolen).not.toBe('SANDBOX_CODE_RAN_ON_HOST');
        });

        it('is inert regardless of whether the descriptor also carries configurable/enumerable', () => {
            expect.assertions(3);

            const liveTarget = markLive({});
            const env = createLiveEnvironment({ liveTarget });

            env.evaluate(`
                let ran = false;
                // A full accessor descriptor (get + enumerable + configurable):
                // still an accessor, still contained.
                Object.defineProperty(liveTarget, 'full', {
                    configurable: true,
                    enumerable: true,
                    get() {
                        ran = true;
                        return 1;
                    },
                });
                expect(liveTarget.full).toBe(undefined);
                expect(ran).toBe(false);
            `);

            expect(Reflect.getOwnPropertyDescriptor(liveTarget, 'full')).toBe(undefined);
        });
    });

    describe('default (no explicit configurable) accessor descriptors do not break read-side proxy invariants', () => {
        // `Object.defineProperty` defaults `configurable` to `false` when the
        // descriptor omits it, which is the common `{ get() {...} }` shape. The
        // shadow-scoped copy must still be written with `configurable: true`
        // (see the block comment above `liveAccessorGuardedDefinePropertyTrap`):
        // a live proxy's `has`, `ownKeys`, and `getOwnPropertyDescriptor` traps
        // are NOT overridden by `makeProxyLive()` and always resolve against the
        // RAW foreign target, so a non-configurable OWN key on the shadow target
        // (the proxy's actual `[[ProxyTarget]]`) would be impossible for those
        // traps to mirror and every subsequent enumeration/lookup would throw a
        // native proxy-invariant `TypeError`. Forcing `configurable: true` is not
        // observable to the sandbox because the accessor is invisible through
        // the proxy either way (reads resolve against the raw target).
        it('Object.keys does not throw and omits the contained key', () => {
            expect.assertions(2);

            const liveTarget = markLive({ own: 1 });
            const env = createLiveEnvironment({ liveTarget });

            env.evaluate(`
                Object.defineProperty(liveTarget, 'k', {
                    get() {
                        return 'leak';
                    },
                });
                expect(Object.keys(liveTarget)).toEqual(['own']);
            `);

            expect(Object.keys(liveTarget)).toEqual(['own']);
        });

        it("'in' does not throw and reports the contained key as absent", () => {
            expect.assertions(2);

            const liveTarget = markLive({});
            const env = createLiveEnvironment({ liveTarget });

            env.evaluate(`
                Object.defineProperty(liveTarget, 'k', {
                    get() {
                        return 'leak';
                    },
                });
                expect('k' in liveTarget).toBe(false);
            `);

            expect('k' in liveTarget).toBe(false);
        });

        it('object spread does not throw and omits the contained key', () => {
            expect.assertions(1);

            const liveTarget = markLive({ own: 1 });
            const env = createLiveEnvironment({ liveTarget });

            env.evaluate(`
                Object.defineProperty(liveTarget, 'k', {
                    get() {
                        return 'leak';
                    },
                });
                const copy = { ...liveTarget };
                expect(copy).toEqual({ own: 1 });
            `);
        });

        it('JSON.stringify does not throw and omits the contained key', () => {
            expect.assertions(1);

            const liveTarget = markLive({ own: 1 });
            const env = createLiveEnvironment({ liveTarget });

            env.evaluate(`
                Object.defineProperty(liveTarget, 'k', {
                    get() {
                        return 'leak';
                    },
                });
                expect(JSON.stringify(liveTarget)).toBe('{"own":1}');
            `);
        });

        it('Object.getOwnPropertyDescriptor does not throw and reports undefined', () => {
            expect.assertions(2);

            const liveTarget = markLive({});
            const env = createLiveEnvironment({ liveTarget });

            env.evaluate(`
                Object.defineProperty(liveTarget, 'k', {
                    get() {
                        return 'leak';
                    },
                });
                expect(Object.getOwnPropertyDescriptor(liveTarget, 'k')).toBe(undefined);
            `);

            expect(Reflect.getOwnPropertyDescriptor(liveTarget, 'k')).toBe(undefined);
        });

        it('handles a default descriptor with a set only the same way', () => {
            expect.assertions(3);

            const liveTarget = markLive({});
            const env = createLiveEnvironment({ liveTarget });

            env.evaluate(`
                let setterRan = false;
                Object.defineProperty(liveTarget, 'sink', {
                    set() {
                        setterRan = true;
                    },
                });
                expect(() => Object.keys(liveTarget)).not.toThrow();
                expect('sink' in liveTarget).toBe(false);
            `);

            expect(Reflect.getOwnPropertyDescriptor(liveTarget, 'sink')).toBe(undefined);
        });

        it('the security property holds: the raw target never gains the accessor and a host read runs no sandbox code', () => {
            expect.assertions(3);

            const liveTarget = markLive({});
            const env = createLiveEnvironment({ liveTarget });

            env.evaluate(`
                Object.defineProperty(liveTarget, 'stolen', {
                    get() {
                        // Must never run on the host with the raw receiver.
                        return 'SANDBOX_CODE_RAN_ON_HOST';
                    },
                });
                expect(liveTarget.stolen).toBe(undefined);
            `);

            expect(Reflect.getOwnPropertyDescriptor(liveTarget, 'stolen')).toBe(undefined);
            expect(liveTarget.stolen).not.toBe('SANDBOX_CODE_RAN_ON_HOST');
        });
    });

    describe('an explicit configurable: false accessor descriptor fails fast at the defineProperty call', () => {
        // Forcing the shadow-scoped copy to `configurable: true` (see above)
        // keeps the default shape fully clean, but it means an explicit
        // `configurable: false` request cannot be honored while also keeping
        // the accessor invisible through the proxy: the engine's own
        // `defineProperty` trap-result invariant check compares the SANDBOX'S
        // requested descriptor (non-configurable) against the resulting target
        // descriptor (configurable, because we forced it) and rejects the
        // mismatch. The result is a native `TypeError` thrown synchronously at
        // the `Object.defineProperty`/`Reflect.defineProperty` call site inside
        // the sandbox — fail-fast, rather than deferring the detonation to a
        // later, unrelated read as the unguarded shape used to. This is the
        // documented, intentional behavior for this shape: you cannot install a
        // non-configurable accessor that stays off the raw object while keeping
        // the live read traps consistent.
        it('Object.defineProperty throws synchronously and never reaches the raw target', () => {
            expect.assertions(2);

            const liveTarget = markLive({});
            const env = createLiveEnvironment({ liveTarget });

            env.evaluate(`
                let threw = false;
                let isTypeError = false;
                try {
                    Object.defineProperty(liveTarget, 'k', {
                        configurable: false,
                        get() {
                            return 'leak';
                        },
                    });
                } catch (e) {
                    threw = true;
                    isTypeError = e instanceof TypeError;
                }
                expect(threw).toBe(true);
                expect(isTypeError).toBe(true);
            `);
        });

        it('Reflect.defineProperty throws synchronously for the same shape', () => {
            expect.assertions(2);

            const liveTarget = markLive({});
            const env = createLiveEnvironment({ liveTarget });

            env.evaluate(`
                let threw = false;
                let isTypeError = false;
                try {
                    Reflect.defineProperty(liveTarget, 'k', {
                        configurable: false,
                        set() {},
                    });
                } catch (e) {
                    threw = true;
                    isTypeError = e instanceof TypeError;
                }
                expect(threw).toBe(true);
                expect(isTypeError).toBe(true);
            `);
        });
    });

    describe('data descriptors stay passthru (the expando capability is preserved)', () => {
        it('passes a data expando through to the raw target via Object.defineProperty', () => {
            expect.assertions(3);

            const liveTarget = markLive({});
            const env = createLiveEnvironment({ liveTarget });

            env.evaluate(`
                Object.defineProperty(liveTarget, 'dataExpando', {
                    configurable: true,
                    writable: true,
                    value: 'DATA_VALUE',
                });
                // A data descriptor is passthru: the value lands on the raw
                // target and reads back through the live get.
                expect(liveTarget.dataExpando).toBe('DATA_VALUE');
            `);

            // Host observes the expando on the raw target.
            expect(liveTarget.dataExpando).toBe('DATA_VALUE');
            const rawDesc = Reflect.getOwnPropertyDescriptor(liveTarget, 'dataExpando');
            expect(rawDesc && rawDesc.value).toBe('DATA_VALUE');
        });

        it('passes a function-valued data expando through to the raw target', () => {
            expect.assertions(2);

            const liveTarget = markLive({});
            const env = createLiveEnvironment({ liveTarget });

            env.evaluate(`
                // A function VALUE is still a data descriptor (no get/set key),
                // so it passes through. Only accessor descriptors are contained.
                Object.defineProperty(liveTarget, 'fn', {
                    configurable: true,
                    writable: true,
                    value: function tag() {
                        return 'RED_FN';
                    },
                });
                expect(typeof liveTarget.fn).toBe('function');
            `);

            expect(typeof liveTarget.fn).toBe('function');
        });

        it('keeps set, deleteProperty, and indexed writes flowing after an accessor is contained', () => {
            expect.assertions(6);

            const liveTarget = markLive({ removable: 'gone-soon' });
            const env = createLiveEnvironment({ liveTarget });

            env.evaluate(`
                // Contain an accessor, then confirm every other live capability
                // still reaches the raw shared target.
                Object.defineProperty(liveTarget, 'acc', {
                    configurable: true,
                    get() {
                        return 'contained';
                    },
                });
                liveTarget.added = 'via-set';
                delete liveTarget.removable;
                expect(liveTarget.acc).toBe(undefined);
                expect(liveTarget.added).toBe('via-set');
                expect('removable' in liveTarget).toBe(false);
            `);

            // Host observes the value mutations on the raw target; the accessor
            // is not present there.
            expect(liveTarget.added).toBe('via-set');
            expect('removable' in liveTarget).toBe(false);
            expect(Reflect.getOwnPropertyDescriptor(liveTarget, 'acc')).toBe(undefined);
        });

        it('positive control: the same accessor IS observable on a red-native object', () => {
            // Proves the inertness assertions above are meaningful and not
            // vacuous. defineProperty of an accessor onto an object the sandbox
            // itself created (a red-native object) DOES take effect and DOES run
            // on read. The security property is that the same operation is inert
            // only when the target is a live host object crossing the membrane.
            expect.assertions(3);

            const liveTarget = markLive({});
            const env = createLiveEnvironment({ liveTarget });

            env.evaluate(`
                let redRan = false;
                const redObject = {};
                Object.defineProperty(redObject, 'acc', {
                    configurable: true,
                    get() {
                        redRan = true;
                        return 'red-native';
                    },
                });
                // On a red-native object the accessor is a normal ordinary
                // operation: the getter runs and resolves.
                expect(redObject.acc).toBe('red-native');
                expect(redRan).toBe(true);

                // On the live host target the identical operation is inert.
                let liveRan = false;
                Object.defineProperty(liveTarget, 'acc', {
                    configurable: true,
                    get() {
                        liveRan = true;
                        return 'live';
                    },
                });
                expect(liveTarget.acc).toBe(undefined);
            `);
        });
    });
});

describe('defineProperty accessor isolation on structurally-live foreign arrays and typed arrays', () => {
    it('does not plant an accessor on a foreign array and keeps index access intact', () => {
        expect.assertions(5);

        const blueArray = [10, 20, 30];
        const env = createLiveEnvironment({ blueArray });

        env.evaluate(`
            let ran = false;
            Object.defineProperty(blueArray, 'pwned', {
                configurable: true,
                get() {
                    ran = true;
                    return 'leak';
                },
            });
            expect(blueArray.pwned).toBe(undefined);
            expect(ran).toBe(false);
            // Liveness intact: indexed writes still reach the backing array.
            blueArray[0] = 99;
            expect(blueArray[0]).toBe(99);
        `);

        expect(blueArray[0]).toBe(99);
        expect(Reflect.getOwnPropertyDescriptor(blueArray, 'pwned')).toBe(undefined);
    });

    it('does not plant an accessor on a foreign typed array and keeps index/length intact', () => {
        expect.assertions(5);

        const blueU8 = new Uint8Array([1, 2, 3, 4]);
        const env = createLiveEnvironment({ blueU8 });

        env.evaluate(`
            let ran = false;
            Object.defineProperty(blueU8, 'pwned', {
                configurable: true,
                get() {
                    ran = true;
                    return 'leak';
                },
            });
            expect(blueU8.pwned).toBe(undefined);
            expect(ran).toBe(false);
            // The typed-array fast path is unaffected: indices and cached length
            // still resolve against the buffer.
            expect(blueU8[2]).toBe(3);
            blueU8[0] = 42;
            expect(blueU8[0]).toBe(42);
        `);

        expect(blueU8[0]).toBe(42);
    });
});

describe('defineProperty on plain (static) foreign objects is unaffected by the fix', () => {
    it('keeps a static accessor definition scoped to the shadow target', () => {
        expect.assertions(3);

        const staticObj = { own: 1 };
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect, staticObj }),
        });

        env.evaluate(`
            let ran = false;
            Object.defineProperty(staticObj, 'acc', {
                configurable: true,
                get() {
                    ran = true;
                    return 'static';
                },
            });
            // For a static proxy the definition lands on the shadow target, so
            // the sandbox observes its own accessor locally.
            expect(staticObj.acc).toBe('static');
            expect(ran).toBe(true);
        `);

        // The raw host object is untouched: static defineProperty was never
        // passthru, so this behavior is the pre-existing baseline, not the fix.
        expect(Reflect.getOwnPropertyDescriptor(staticObj, 'acc')).toBe(undefined);
    });
});
