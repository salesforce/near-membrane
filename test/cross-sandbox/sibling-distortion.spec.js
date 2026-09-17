import { sandbox, makeSandboxes } from './__util__/harness.js';

/**
 * AC (novel dimension) -- distortions across the double membrane (red-A -> blue -> red-B).
 *
 * Adapts `test/distortions/getter.spec.js` and `test/distortions/methods.spec.js`
 * (single-crossing) to the sibling-sandbox topology. `distortionCallback` is a
 * per-environment construction option: the membrane consults it with each
 * function/getter reference it marshals, and the callback returns a replacement
 * (or the original). The single-crossing tests key a Map on the exact host
 * function IDENTITY and prove (a) getters/methods are distorted, and (b) a
 * blue-side wrapper closure over the raw function BYPASSES the distortion because
 * the raw reference never crosses the membrane.
 *
 * Open question this spec answers: when an object is created in red-A and reaches
 * red-B (red-A -> blue -> red-B), is B's own `distortionCallback` consulted for
 * that A-origin object's getter/method? We cannot pre-capture the blue-proxy
 * identity of an A-origin function, so we match by a distinctive function `name`
 * inside the callback and characterize what B actually observes.
 *
 * Values locked to observed behavior on `main` (HEAD).
 */

// A distortionCallback that swaps any function whose name is a key of `byName`,
// and records every function name it was consulted with (for diagnostics).
function nameKeyedDistortion(byName) {
    const seen = [];
    const callback = (v) => {
        if (typeof v === 'function') {
            let name;
            try {
                name = v.name;
            } catch {
                name = undefined;
            }
            seen.push(name);
            if (name && Object.prototype.hasOwnProperty.call(byName, name)) {
                return byName[name];
            }
        }
        return v;
    };
    return { callback, seen };
}

describe('cross-sandbox distortion: B distortion vs an A-origin object (A->B)', () => {
    it('B distortion IS consulted for an A-origin getter read from B', () => {
        expect.assertions(1);
        const a = sandbox({});
        const aObj = a.evaluate(`
            const o = {};
            Object.defineProperty(o, 'answer', {
                get: function redAGetter() { return 'from-A-getter'; },
                enumerable: true,
                configurable: true,
            });
            o;
        `);
        const { callback } = nameKeyedDistortion({
            redAGetter: () => 'DISTORTED-GETTER-B',
        });
        const b = sandbox({ aObj }, { distortionCallback: callback });
        // B reads the A-origin getter across the double membrane.
        expect(b.evaluate('aObj.answer')).toBe('DISTORTED-GETTER-B');
    });

    it('B distortion IS consulted for an A-origin method called from B', () => {
        expect.assertions(1);
        const a = sandbox({});
        const aObj = a.evaluate(`
            const o = { greet: function redAMethod() { return 'from-A-method'; } };
            o;
        `);
        const { callback } = nameKeyedDistortion({
            redAMethod: () => 'DISTORTED-METHOD-B',
        });
        const b = sandbox({ aObj }, { distortionCallback: callback });
        expect(b.evaluate('aObj.greet()')).toBe('DISTORTED-METHOD-B');
    });
});

describe('cross-sandbox distortion: blue-side wrapper closure bypasses B distortion', () => {
    it('a blue wrapper closing over an A function is NOT distorted by B (raw ref never crosses)', () => {
        expect.assertions(1);
        const a = sandbox({});
        const aFn = a.evaluate('(function redAMethod() { return "from-A-method"; })');
        // Blue-side wrapper closes over the A function; the raw aFn reference is
        // never presented to B's membrane as a distortable value.
        const wrappedA = (...args) => aFn(...args);
        const { callback } = nameKeyedDistortion({
            redAMethod: () => 'DISTORTED-METHOD-B',
        });
        const b = sandbox({ wrappedA }, { distortionCallback: callback });
        // Mirrors the single-crossing bypass: distortion does not fire.
        expect(b.evaluate('wrappedA()')).toBe('from-A-method');
    });
});

describe("cross-sandbox distortion: A's own distortion does not govern B's view", () => {
    it("A's distortionCallback does not distort an A-origin getter observed from B", () => {
        expect.assertions(1);
        // A distorts by name too, but its target is an A-native getter that never
        // crosses INTO A, so A's callback has no occasion to rewrite it; B (with no
        // distortion) simply observes A's real value.
        const aDist = nameKeyedDistortion({ redAGetter: () => 'DISTORTED-IN-A' });
        const { a, b } = makeSandboxes({ distortionCallback: aDist.callback }, {});
        const aObj = a.evaluate(`
            const o = {};
            Object.defineProperty(o, 'answer', {
                get: function redAGetter() { return 'from-A-getter'; },
                enumerable: true,
                configurable: true,
            });
            o;
        `);
        expect(b.evaluate('(o) => o.answer')(aObj)).toBe('from-A-getter');
    });
});
