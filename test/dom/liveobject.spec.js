import createVirtualEnvironment from '@locker/near-membrane-dom';

const LOCKER_LIVE_VALUE_MARKER_SYMBOL = Symbol.for('@@lockerLiveValue');

const env = createVirtualEnvironment(window, {
    endowments: Object.getOwnPropertyDescriptors(window),
});

describe('@@lockerLiveValue', () => {
    it('applies to HTMLElement.prototype.style', () => {
        expect.assertions(2);

        const div = document.createElement('div');
        const id = 'marked-live';
        div.id = id;
        document.body.appendChild(div);
        Reflect.defineProperty(div.style, LOCKER_LIVE_VALUE_MARKER_SYMBOL, {});

        env.evaluate(`
            const div = document.querySelector('#${id}');
            div.style.color = 'red';
            expect(div.style.color).toBe('red');
        `);

        const styleAttributeValue = div.getAttribute('style');
        expect(styleAttributeValue).toBe('color: red;');
    });
    it('from system mode class', () => {
        expect.assertions(16);

        class X {
            constructor() {
                this[LOCKER_LIVE_VALUE_MARKER_SYMBOL] = undefined;
                this.foo = 0;
            }

            getFooFromOutside() {
                return this.foo;
            }

            hasFooFromOutside() {
                return 'foo' in this;
            }

            incrementFooFromOutside() {
                this.foo++;
            }
        }
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({
                X,
                expect,
                createYFromOutside(Y) {
                    // eslint-disable-next-line no-new
                    new Y();
                },
            }),
        });

        env.evaluate(`
            class Y extends X {
                constructor() {
                    super();

                    expect('foo' in this).toBe(true);
                    expect(this.foo).toBe(0);
                    expect(this.hasFooFromOutside()).toBe(true);
                    expect(this.getFooFromOutside()).toBe(0);
                    this.foo = 9;

                    expect(this.foo).toBe(9);
                    expect(this.getFooFromOutside()).toBe(9);

                    this.incrementFooFromOutside();

                    expect(this.foo).toBe(10);
                    expect(this.getFooFromOutside()).toBe(10);
                }
            }
            new Y();
            createYFromOutside(Y);
        `);
    });

    it('missing from system mode class', () => {
        expect.assertions(16);
        class A {
            constructor() {
                this.foo = 0;
            }

            getFooFromOutside() {
                return this.foo;
            }

            hasFooFromOutside() {
                return 'foo' in this;
            }

            incrementFooFromOutside() {
                this.foo++;
            }
        }
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({
                A,
                expect,
                createBFromOutside(B) {
                    // eslint-disable-next-line no-new
                    new B();
                },
            }),
        });

        env.evaluate(`
            class B extends A {
                constructor() {
                    super();

                    expect('foo' in this).toBe(true);
                    expect(this.foo).toBe(0);
                    expect(this.hasFooFromOutside()).toBe(true);
                    expect(this.getFooFromOutside()).toBe(0);
                    this.foo = 9;

                    expect(this.foo).toBe(9);
                    expect(this.getFooFromOutside()).toBe(0);

                    this.incrementFooFromOutside();

                    expect(this.foo).toBe(9);
                    expect(this.getFooFromOutside()).toBe(1);
                }
            }
            createBFromOutside(B);
            new B();
        `);
    });
});
