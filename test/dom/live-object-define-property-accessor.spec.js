import createVirtualEnvironment from '@locker/near-membrane-dom';

// W-23552746 in its DOM form: a live DOM object (here a CSSStyleDeclaration
// obtained via an element's `style`, the same live producer the reporter used
// for the setPrototypeOf variant) onto which the sandbox defines an ACCESSOR
// property. A live target's `defineProperty` trap is otherwise passthru, so the
// accessor would be planted on the RAW style object; a later access from the
// primary realm would run the sandbox getter/setter with the RAW object as
// receiver. These tests mark real DOM live objects with the `@@lockerLiveValue`
// marker (the mechanism locker uses in production) and confirm the accessor is
// contained on the shadow target, while data expandos still pass through. The
// companion `test/membrane/define-property-accessor-isolation.spec.js` covers
// the same contract with plain endowed live targets.

const LOCKER_LIVE_VALUE_MARKER_SYMBOL = Symbol.for('@@lockerLiveValue');

function createLiveDomEnvironment(extraEndowments) {
    return createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors(Object.assign({ expect }, extraEndowments)),
        liveTargetCallback(target) {
            return Object.hasOwn(target, LOCKER_LIVE_VALUE_MARKER_SYMBOL);
        },
    });
}

describe('@@lockerLiveValue defineProperty accessor isolation (DOM realm)', () => {
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

    it('does not plant a sandbox getter on the raw style object via Object.defineProperty', () => {
        expect.assertions(3);

        const id = 'accessor-onto-style';
        const div = appendMarkedDiv(id);
        const env = createLiveDomEnvironment();

        env.evaluate(`
            const style = document.querySelector('#${id}').style;
            let ran = false;
            Object.defineProperty(style, 'pwned', {
                configurable: true,
                get() {
                    ran = true;
                    return 'SANDBOX_GETTER';
                },
            });
            // A live get resolves against the raw style object, which never
            // gained the accessor, so the sandbox reads back undefined.
            expect(style.pwned).toBe(undefined);
            expect(ran).toBe(false);
        `);

        // Host side: the raw style object has no such accessor, so a read from
        // the primary realm runs no sandbox code.
        expect(Reflect.getOwnPropertyDescriptor(div.style, 'pwned')).toBe(undefined);
    });

    it('keeps inline style writes flowing to the host after an accessor is contained', () => {
        expect.assertions(3);

        const id = 'liveness-after-accessor';
        const div = appendMarkedDiv(id);
        const env = createLiveDomEnvironment();

        env.evaluate(`
            const style = document.querySelector('#${id}').style;
            Object.defineProperty(style, 'pwned', {
                configurable: true,
                get() {
                    return 'contained';
                },
            });
            // Liveness must be intact: the set trap still reaches the raw
            // element, and the raw color accessor still wins.
            style.color = 'red';
            expect(style.color).toBe('red');
            expect(style.pwned).toBe(undefined);
        `);

        expect(div.style.color).toBe('red');
    });

    it('passes a data expando through to the raw style object via Object.defineProperty', () => {
        expect.assertions(2);

        const id = 'data-expando-onto-style';
        const div = appendMarkedDiv(id);
        const env = createLiveDomEnvironment();

        env.evaluate(`
            const style = document.querySelector('#${id}').style;
            // A data descriptor is passthru: the expando lands on the raw style
            // object (the capability live targets rely on).
            Object.defineProperty(style, 'dataExpando', {
                configurable: true,
                writable: true,
                value: 'DATA_VALUE',
            });
            expect(style.dataExpando).toBe('DATA_VALUE');
        `);

        expect(div.style.dataExpando).toBe('DATA_VALUE');
    });

    it('does not break has/ownKeys/getOwnPropertyDescriptor invariants for a default (no explicit configurable) accessor', () => {
        // `Object.defineProperty` defaults `configurable` to `false`. See the
        // companion `test/membrane/define-property-accessor-isolation.spec.js`
        // for the full invariant explanation: the shadow-scoped copy must be
        // forced to `configurable: true` or the live `has`/`ownKeys`/
        // `getOwnPropertyDescriptor` traps (which resolve against the RAW style
        // object, not the shadow target) could never mirror a non-configurable
        // own key on the shadow target and every subsequent lookup would throw.
        expect.assertions(4);

        const id = 'default-accessor-onto-style';
        appendMarkedDiv(id);
        const env = createLiveDomEnvironment();

        env.evaluate(`
            const style = document.querySelector('#${id}').style;
            let ran = false;
            Object.defineProperty(style, 'pwned', {
                get() {
                    ran = true;
                    return 'leak';
                },
            });
            expect(() => 'pwned' in style).not.toThrow();
            expect('pwned' in style).toBe(false);
            expect(() => Object.getOwnPropertyDescriptor(style, 'pwned')).not.toThrow();
            expect(Object.getOwnPropertyDescriptor(style, 'pwned')).toBe(undefined);
        `);
    });

    it('fails fast with a native TypeError for an explicit configurable: false accessor', () => {
        // The shadow-scoped copy is forced to `configurable: true`, so an
        // explicit `configurable: false` request cannot be honored while
        // keeping the accessor invisible through the proxy. The engine's own
        // `defineProperty` trap-result invariant check rejects the mismatch
        // synchronously at the call site, rather than deferring the detonation
        // to a later read.
        expect.assertions(2);

        const id = 'non-configurable-accessor-onto-style';
        appendMarkedDiv(id);
        const env = createLiveDomEnvironment();

        env.evaluate(`
            const style = document.querySelector('#${id}').style;
            let threw = false;
            let isTypeError = false;
            try {
                Object.defineProperty(style, 'pwned', {
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
});
