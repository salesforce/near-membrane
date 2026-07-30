import createVirtualEnvironment from '@locker/near-membrane-dom';

// W-23623814 in its originally reported form: a live DOM object (the reporter
// used a CSSStyleDeclaration obtained via an element's `style`) whose prototype
// is spliced from inside the sandbox to reach the primary-realm global. These
// tests mark real DOM live objects with the `@@lockerLiveValue` marker (the
// same mechanism locker uses in production) and confirm that no proto splice,
// through any syntax, exposes foreign state or reparents the raw DOM object.
//
// Leak detection uses an endowed blue object carrying an OWN sentinel property
// as the spliced prototype. That is the unambiguous signal: the sentinel is a
// blue-realm own property, so it is only ever visible through inherited lookup
// if the splice reached the raw target's prototype chain. (Splicing the sandbox
// `globalThis` is a weaker probe here because the red realm's global does not
// mirror blue-realm expandos, so a global read can read `undefined` for reasons
// unrelated to the fix.) The companion
// `test/membrane/set-prototype-of-isolation.spec.js` covers the same contract
// with plain endowed live targets.

const LOCKER_LIVE_VALUE_MARKER_SYMBOL = Symbol.for('@@lockerLiveValue');
const SENTINEL_KEY = 'INHERITED_BLUE_SECRET';
const SENTINEL_VALUE = 'blue-realm-only';

function createLiveDomEnvironment(extraEndowments) {
    return createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors(Object.assign({ expect }, extraEndowments)),
        liveTargetCallback(target) {
            return Object.hasOwn(target, LOCKER_LIVE_VALUE_MARKER_SYMBOL);
        },
    });
}

describe('@@lockerLiveValue setPrototypeOf isolation (DOM realm)', () => {
    let created;

    beforeEach(() => {
        created = [];
    });

    afterEach(() => {
        for (const node of created) {
            node.remove();
        }
        created = [];
    });

    function appendMarkedDiv(id) {
        const div = document.createElement('div');
        div.id = id;
        document.body.appendChild(div);
        created.push(div);
        // Mark the element's inline style declaration live, mirroring the
        // reported CSSStyleDeclaration scenario.
        Reflect.defineProperty(div.style, LOCKER_LIVE_VALUE_MARKER_SYMBOL, {});
        return div;
    }

    it('does not leak a spliced blue prototype secret via Object.setPrototypeOf', () => {
        expect.assertions(3);

        const id = 'splice-payload-onto-style';
        const div = appendMarkedDiv(id);
        const originalStyleProto = Reflect.getPrototypeOf(div.style);
        const bluePayload = { [SENTINEL_KEY]: SENTINEL_VALUE };
        const env = createLiveDomEnvironment({ bluePayload });

        env.evaluate(`
            const style = document.querySelector('#${id}').style;
            // Reparent the live style declaration onto a blue object carrying a
            // secret. If the change reached the raw style object, an inherited
            // read would resolve the secret against the raw prototype chain.
            Object.setPrototypeOf(style, bluePayload);
            expect(style.${SENTINEL_KEY}).toBe(undefined);
            expect(Object.getPrototypeOf(style)).not.toBe(bluePayload);
        `);

        // Host side: the raw style object's prototype is untouched.
        expect(Reflect.getPrototypeOf(div.style)).toBe(originalStyleProto);
    });

    it('does not leak a spliced blue prototype secret via the __proto__ setter', () => {
        expect.assertions(2);

        const id = 'proto-setter-onto-style';
        const div = appendMarkedDiv(id);
        const originalStyleProto = Reflect.getPrototypeOf(div.style);
        const bluePayload = { [SENTINEL_KEY]: SENTINEL_VALUE };
        const env = createLiveDomEnvironment({ bluePayload });

        env.evaluate(`
            const style = document.querySelector('#${id}').style;
            // eslint-disable-next-line no-proto
            style.__proto__ = bluePayload;
            expect(style.${SENTINEL_KEY}).toBe(undefined);
        `);

        expect(Reflect.getPrototypeOf(div.style)).toBe(originalStyleProto);
    });

    it('does not reparent the raw style object when the sandbox global is spliced', () => {
        expect.assertions(2);

        const id = 'splice-global-onto-style';
        const div = appendMarkedDiv(id);
        const originalStyleProto = Reflect.getPrototypeOf(div.style);
        const env = createLiveDomEnvironment();

        env.evaluate(`
            const style = document.querySelector('#${id}').style;
            // The reported gadget: reparent the live style declaration onto the
            // sandbox global. The observable, fix-relevant invariant is that the
            // raw object is not reparented across the membrane.
            Object.setPrototypeOf(style, globalThis);
            expect(Object.getPrototypeOf(style)).not.toBe(globalThis);
        `);

        // Host side: the raw style object's prototype is unchanged, so it was
        // never spliced onto the primary-realm global.
        expect(Reflect.getPrototypeOf(div.style)).toBe(originalStyleProto);
    });

    it('keeps inline style writes flowing to the host after a splice attempt', () => {
        expect.assertions(3);

        const id = 'liveness-after-splice';
        const div = appendMarkedDiv(id);
        const env = createLiveDomEnvironment();

        env.evaluate(`
            const style = document.querySelector('#${id}').style;
            Object.setPrototypeOf(style, { color: 'green' });
            // Liveness must be intact: the set trap still reaches the raw
            // element, and the raw color accessor wins over the spliced proto.
            style.color = 'red';
            expect(style.color).toBe('red');
        `);

        expect(div.style.color).toBe('red');
        expect(div.getAttribute('style')).toBe('color: red;');
    });

    it('does not degrade a live style declaration when its prototype is wiped to null', () => {
        expect.assertions(3);

        const id = 'null-wipe-style';
        const div = appendMarkedDiv(id);
        const originalStyleProto = Reflect.getPrototypeOf(div.style);
        const env = createLiveDomEnvironment();

        env.evaluate(`
            const style = document.querySelector('#${id}').style;
            Object.setPrototypeOf(style, null);
            // The wipe is inert: the setProperty method inherited from the raw
            // CSSStyleDeclaration prototype is still callable.
            expect(typeof style.setProperty).toBe('function');
            style.setProperty('color', 'blue');
            expect(style.color).toBe('blue');
        `);

        expect(Reflect.getPrototypeOf(div.style)).toBe(originalStyleProto);
    });

    it('reports the raw prototype from getPrototypeOf after a splice attempt', () => {
        expect.assertions(3);

        const id = 'getproto-after-splice';
        const div = appendMarkedDiv(id);
        const originalStyleProto = Reflect.getPrototypeOf(div.style);
        const env = createLiveDomEnvironment();

        env.evaluate(`
            const style = document.querySelector('#${id}').style;
            const before = Object.getPrototypeOf(style);
            Object.setPrototypeOf(style, { spliced: true });
            const after = Object.getPrototypeOf(style);
            // getPrototypeOf is passthru on live targets and reports the raw
            // prototype, which is unchanged by the shadow-scoped splice.
            expect(after).toBe(before);
            expect(after.spliced).toBe(undefined);
        `);

        expect(Reflect.getPrototypeOf(div.style)).toBe(originalStyleProto);
    });

    it('does not leak a blue element expando spliced as a live target prototype', () => {
        expect.assertions(2);

        const id = 'element-proto-splice';
        const div = appendMarkedDiv(id);
        // Stash a blue-only expando on the raw element so a successful splice
        // would surface it through inherited lookup.
        div.BLUE_ELEMENT_EXPANDO = 'element-blue-only';
        const env = createLiveDomEnvironment();

        env.evaluate(`
            const div = document.querySelector('#${id}');
            const style = div.style;
            // Splice the element (a foreign object) onto the live style. Its
            // blue-only expando must not become inherited by the style.
            Object.setPrototypeOf(style, div);
            expect(style.BLUE_ELEMENT_EXPANDO).toBe(undefined);
        `);

        expect(div.BLUE_ELEMENT_EXPANDO).toBe('element-blue-only');
    });
});
