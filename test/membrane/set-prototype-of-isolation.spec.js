import createVirtualEnvironment from '@locker/near-membrane-dom';

// W-23623814: `[[SetPrototypeOf]]` on a live target must be scoped to the
// shadow target. A live proxy resolves reads against the RAW foreign target's
// prototype chain, so if the trap reparented the RAW target the sandbox could
// splice a foreign object (e.g. the primary-realm global) onto a live target
// and read foreign members through inherited lookups. The fix routes the live
// `setPrototypeOf` trap to `staticSetPrototypeOfTrap`, which applies the change
// to the shadow target only. The observable contract is:
//
//   1. A splice from inside the sandbox is inert: inherited members of the
//      spliced prototype are never visible through the live target, and the
//      RAW target's prototype is unchanged.
//   2. The other four live traps (set, defineProperty, deleteProperty,
//      preventExtensions) remain passthru: live targets keep their mutability.
//   3. Wiping a live target's prototype to null is inert, so a shared host
//      object cannot be stripped of its methods from inside the sandbox.

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

describe('setPrototypeOf isolation on live targets', () => {
    describe('the splice is inert (no foreign prototype leak)', () => {
        it('does not leak spliced prototype members via Object.setPrototypeOf', () => {
            expect.assertions(4);

            const liveTarget = markLive({ own: 'own-value' });
            const bluePayload = { INHERITED_SECRET: 'blue-only' };
            const originalProto = Reflect.getPrototypeOf(liveTarget);
            const env = createLiveEnvironment({ liveTarget, bluePayload });

            env.evaluate(`
                // Reparent the live target onto a foreign object carrying a
                // sentinel. If the change reached the raw target, an inherited
                // read would resolve the sentinel against the raw prototype
                // chain (the W-23623814 escape). It must not.
                Object.setPrototypeOf(liveTarget, bluePayload);
                expect(liveTarget.own).toBe('own-value');
                expect(liveTarget.INHERITED_SECRET).toBe(undefined);
            `);

            // Host side: the raw target's prototype is untouched.
            expect(Reflect.getPrototypeOf(liveTarget)).toBe(originalProto);
            expect('INHERITED_SECRET' in liveTarget).toBe(false);
        });

        it('does not leak spliced prototype members via Reflect.setPrototypeOf', () => {
            expect.assertions(3);

            const liveTarget = markLive({});
            const bluePayload = { INHERITED_SECRET: 'blue-only' };
            const originalProto = Reflect.getPrototypeOf(liveTarget);
            const env = createLiveEnvironment({ liveTarget, bluePayload });

            env.evaluate(`
                // Reflect returns true because the shadow target accepts the
                // change, but the change stays on the shadow target.
                const ok = Reflect.setPrototypeOf(liveTarget, bluePayload);
                expect(ok).toBe(true);
                expect(liveTarget.INHERITED_SECRET).toBe(undefined);
            `);

            expect(Reflect.getPrototypeOf(liveTarget)).toBe(originalProto);
        });

        it('does not leak spliced prototype members via the __proto__ setter', () => {
            expect.assertions(2);

            const liveTarget = markLive({});
            const bluePayload = { INHERITED_SECRET: 'blue-only' };
            const originalProto = Reflect.getPrototypeOf(liveTarget);
            const env = createLiveEnvironment({ liveTarget, bluePayload });

            env.evaluate(`
                // eslint-disable-next-line no-proto
                liveTarget.__proto__ = bluePayload;
                expect(liveTarget.INHERITED_SECRET).toBe(undefined);
            `);

            expect(Reflect.getPrototypeOf(liveTarget)).toBe(originalProto);
        });

        it('does not expose foreign global members when the global is spliced as a prototype', () => {
            expect.assertions(3);

            const liveTarget = markLive({});
            const originalProto = Reflect.getPrototypeOf(liveTarget);
            const env = createLiveEnvironment({ liveTarget });

            env.evaluate(`
                // The exact reported gadget: splice the global object onto a
                // live target, then read a global-only binding through
                // inherited lookup. It would only resolve if the splice
                // reached the raw prototype chain.
                Object.setPrototypeOf(liveTarget, globalThis);
                expect(liveTarget.Array).toBe(undefined);
                expect(Object.getPrototypeOf(liveTarget)).not.toBe(globalThis);
            `);

            expect(Reflect.getPrototypeOf(liveTarget)).toBe(originalProto);
        });

        it('remains inert across repeated splices and a restore attempt', () => {
            expect.assertions(2);

            const liveTarget = markLive({});
            const bluePayload = { INHERITED_SECRET: 'blue-only' };
            const originalProto = Reflect.getPrototypeOf(liveTarget);
            const env = createLiveEnvironment({ liveTarget, bluePayload });

            env.evaluate(`
                Object.setPrototypeOf(liveTarget, bluePayload);
                Object.setPrototypeOf(liveTarget, null);
                Object.setPrototypeOf(liveTarget, bluePayload);
                expect(liveTarget.INHERITED_SECRET).toBe(undefined);
            `);

            expect(Reflect.getPrototypeOf(liveTarget)).toBe(originalProto);
        });

        it('does not leak when one live target is spliced onto another', () => {
            expect.assertions(2);

            const liveA = markLive({ fromA: 'a-value' });
            const liveB = markLive({ fromB: 'b-value' });
            const originalProtoB = Reflect.getPrototypeOf(liveB);
            const env = createLiveEnvironment({ liveA, liveB });

            env.evaluate(`
                // Splicing a live target onto another live target must not
                // make the donor's own members inherited by the recipient.
                Object.setPrototypeOf(liveB, liveA);
                expect(liveB.fromA).toBe(undefined);
            `);

            expect(Reflect.getPrototypeOf(liveB)).toBe(originalProtoB);
        });

        it('is inert against a red-native indirection object that transitively inherits from a blue object', () => {
            // This is the case a proto-argument identity check (e.g. "reject the
            // splice only if the proto argument IS the blue document/global")
            // would miss. The sandbox never passes the blue object directly.
            // Instead it builds a RED-NATIVE object, sets ITS prototype to the
            // blue object (an ordinary operation on a red-native object), then
            // splices that indirection object onto the live target. An identity
            // check comparing the proto argument to a known blue object would
            // not match, so the splice would pass through and the live target
            // would inherit the blue member transitively. The fix scopes ALL
            // splices on live targets to the shadow target, so it is inert here
            // regardless of what the proto argument transitively inherits from.
            expect.assertions(3);

            const liveTarget = markLive({});
            const blueSecret = { INHERITED_SECRET: 'blue-only' };
            const originalProto = Reflect.getPrototypeOf(liveTarget);
            const env = createLiveEnvironment({ liveTarget, blueSecret });

            env.evaluate(`
                const indirection = {};
                // Ordinary red-native splice: the indirection object now
                // transitively inherits the blue secret. The sandbox can read
                // it here because blueSecret is endowed; that is expected.
                Object.setPrototypeOf(indirection, blueSecret);
                expect(indirection.INHERITED_SECRET).toBe('blue-only');
                // Splice the indirection object (NOT the blue object itself)
                // onto the live target. An identity check on the proto argument
                // would let this through; the shadow-scoped fix does not.
                Object.setPrototypeOf(liveTarget, indirection);
                expect(liveTarget.INHERITED_SECRET).toBe(undefined);
            `);

            expect(Reflect.getPrototypeOf(liveTarget)).toBe(originalProto);
        });

        it('positive control: the same splice IS visible on a red-native object', () => {
            // This test proves the inertness assertions above are meaningful and
            // not vacuous. A prototype splice from inside the sandbox onto an
            // object the sandbox itself created (a red-native object) DOES take
            // effect and DOES expose inherited members. The security property is
            // that the same operation is inert only when the target is a live
            // host object crossing the membrane. If this control ever fails, the
            // inertness tests are no longer testing containment.
            expect.assertions(3);

            const liveTarget = markLive({});
            const originalProto = Reflect.getPrototypeOf(liveTarget);
            const env = createLiveEnvironment({ liveTarget });

            env.evaluate(`
                const redProto = { INHERITED_SECRET: 'red-native' };
                const redObject = {};
                // On a red-native object the splice is a normal ordinary
                // operation: the inherited member resolves.
                Object.setPrototypeOf(redObject, redProto);
                expect(redObject.INHERITED_SECRET).toBe('red-native');
                // On the live host target the identical operation is inert.
                Object.setPrototypeOf(liveTarget, redProto);
                expect(liveTarget.INHERITED_SECRET).toBe(undefined);
            `);

            expect(Reflect.getPrototypeOf(liveTarget)).toBe(originalProto);
        });
    });

    describe('the other live traps stay passthru', () => {
        it('preserves set, defineProperty, and deleteProperty after a splice attempt', () => {
            expect.assertions(6);

            const liveTarget = markLive({ removable: 'gone-soon' });
            const env = createLiveEnvironment({ liveTarget });

            env.evaluate(`
                Object.setPrototypeOf(liveTarget, { poison: 1 });
                // The remaining live traps must still reach the raw shared target.
                liveTarget.added = 'via-set';
                Object.defineProperty(liveTarget, 'defined', {
                    value: 'via-define',
                    enumerable: true,
                    configurable: true,
                });
                delete liveTarget.removable;
                expect(liveTarget.added).toBe('via-set');
                expect(liveTarget.defined).toBe('via-define');
                expect('removable' in liveTarget).toBe(false);
            `);

            // Host observes every mutation on the raw target.
            expect(liveTarget.added).toBe('via-set');
            expect(liveTarget.defined).toBe('via-define');
            expect('removable' in liveTarget).toBe(false);
        });

        it('keeps element.style-like live writes flowing to the host after a splice attempt', () => {
            expect.assertions(3);

            const backing = { color: '' };
            const liveStyle = markLive({});
            Object.defineProperty(liveStyle, 'color', {
                get() {
                    return backing.color;
                },
                set(value) {
                    backing.color = value;
                },
                enumerable: true,
                configurable: true,
            });
            const env = createLiveEnvironment({ liveStyle });

            env.evaluate(`
                Object.setPrototypeOf(liveStyle, { color: 'green' });
                // The accessor on the raw target must still win: this write
                // flows through the live set trap to the host backing store.
                liveStyle.color = 'red';
                expect(liveStyle.color).toBe('red');
            `);

            expect(backing.color).toBe('red');
            expect(liveStyle.color).toBe('red');
        });
    });

    describe('prototype wipe to null is inert (DoS closed)', () => {
        it('keeps a live target usable after an attempt to wipe its prototype to null', () => {
            expect.assertions(4);

            class Widget {
                constructor() {
                    this.label = 'rendered';
                }

                render() {
                    return this.label;
                }
            }
            const liveWidget = markLive(new Widget());
            const env = createLiveEnvironment({ liveWidget });

            env.evaluate(`
                // A live target is shared with the host. Wiping its prototype
                // from inside the sandbox must not strip the host's methods.
                Object.setPrototypeOf(liveWidget, null);
                expect(typeof liveWidget.render).toBe('function');
                expect(liveWidget.render()).toBe('rendered');
            `);

            expect(Reflect.getPrototypeOf(liveWidget)).not.toBe(null);
            expect(liveWidget.render()).toBe('rendered');
        });
    });
});

describe('setPrototypeOf on structurally-live foreign arrays and typed arrays', () => {
    it('preserves index reads and writes on a foreign array after a splice attempt', () => {
        expect.assertions(6);

        const blueArray = [10, 20, 30];
        const env = createLiveEnvironment({ blueArray });

        env.evaluate(`
            expect(blueArray[0]).toBe(10);
            Object.setPrototypeOf(blueArray, { poison: 1 });
            expect(blueArray[1]).toBe(20);
            expect(blueArray.poison).toBe(undefined);
            blueArray[0] = 99;
            expect(blueArray[0]).toBe(99);
        `);

        expect(blueArray[0]).toBe(99);
        expect(Reflect.getPrototypeOf(blueArray)).toBe(Array.prototype);
    });

    it('preserves typed array index access and cached length after a splice attempt', () => {
        expect.assertions(7);

        const blueU8 = new Uint8Array([1, 2, 3, 4]);
        const env = createLiveEnvironment({ blueU8 });

        env.evaluate(`
            expect(blueU8[0]).toBe(1);
            expect(blueU8.length).toBe(4);
            // The typed-array get fast path reads indices from the buffer using
            // a construction-time cached length; splicing a { length: 0 }
            // prototype must not shadow that.
            Object.setPrototypeOf(blueU8, { length: 0 });
            expect(blueU8[2]).toBe(3);
            expect(blueU8.length).toBe(4);
            blueU8[0] = 42;
            expect(blueU8[0]).toBe(42);
        `);

        expect(blueU8[0]).toBe(42);
        expect(Reflect.getPrototypeOf(blueU8)).toBe(Uint8Array.prototype);
    });

    it('preserves branding of a foreign typed array after a null prototype wipe', () => {
        expect.assertions(3);

        const blueU8 = new Uint8Array([5, 6, 7]);
        const env = createLiveEnvironment({ blueU8 });

        env.evaluate(`
            const tag = (o) => Object.prototype.toString.call(o).slice(8, -1);
            expect(tag(blueU8)).toBe('Uint8Array');
            Reflect.setPrototypeOf(blueU8, null);
            // The wipe is inert on the live target, so branding is preserved.
            expect(tag(blueU8)).toBe('Uint8Array');
        `);

        expect(Object.prototype.toString.call(blueU8).slice(8, -1)).toBe('Uint8Array');
    });
});

describe('setPrototypeOf on plain (static) foreign objects is unaffected by the fix', () => {
    it('keeps a static proto splice scoped to the shadow target', () => {
        expect.assertions(4);

        const staticObj = { own: 1 };
        const originalProto = Reflect.getPrototypeOf(staticObj);
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ expect, staticObj }),
        });

        env.evaluate(`
            Object.setPrototypeOf(staticObj, { poison: 1 });
            // For a static proxy the change lands on the shadow target, so the
            // sandbox observes it locally.
            expect(Object.getPrototypeOf(staticObj).poison).toBe(1);
            expect(staticObj.poison).toBe(1);
        `);

        // The raw host object is untouched.
        expect(Reflect.getPrototypeOf(staticObj)).toBe(originalProto);
        expect('poison' in staticObj).toBe(false);
    });
});
