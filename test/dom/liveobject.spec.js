import createVirtualEnvironment from '@locker/near-membrane-dom';

const env = createVirtualEnvironment(window, window);

describe('@@lockerLiveValue', () => {
    it('applies to HTMLElement.prototype.style', () => {
        expect.assertions(2);

        const div = document.createElement('div');
        const id = 'marked-live';
        div.id = id;
        document.body.appendChild(div);

        Reflect.defineProperty(div.style, Symbol.for('@@lockerLiveValue'), {
            value: undefined,
            configurable: false,
            enumerable: false,
            writable: false,
        });

        env.evaluate(`
        const div = document.querySelector('#${id}');
        div.style.color = 'red';
        expect(div.style.color).toBe('red');
        `);

        const styleAttributeValue = div.getAttribute('style');
        expect(styleAttributeValue).toBe('color: red;');
    });

    it('from system mode class', () => {
        expect.assertions(10);

        const SYMBOL = Symbol.for('@@lockerLiveValue');
        class X {
            constructor() {
                this[SYMBOL] = undefined;
                this.foo = 0;
            }

            incrementXFromOutside() {
                this.foo++;
            }

            getFooFromOutside() {
                return this.foo;
            }
        }

        const endowments = {
            X,
            expect,
            createYFromOutside(Y) {
                // eslint-disable-next-line no-new
                new Y();
            },
        };

        const env = createVirtualEnvironment(window, window, { endowments });

        env.evaluate(`
            class Y extends X {
                constructor() {
                    super();

                    expect(this.getFooFromOutside()).toBe(0);

                    this.foo = 9;

                    expect(this.foo).toBe(9);
                    expect(this.getFooFromOutside()).toBe(9);

                    this.incrementXFromOutside();

                    expect(this.foo).toBe(10);
                    expect(this.getFooFromOutside()).toBe(10);
                }
            }
            new Y();
            createYFromOutside(Y);
        `);
    });

    it('missing from system mode class', () => {
        // expect.assertions(10);
        class A {
            constructor() {
                this.foo = 0;
            }

            incrementAFromOutside() {
                this.foo++;
            }

            getFooFromOutside() {
                return this.foo;
            }
        }

        const endowments = {
            A,
            expect,
            createBFromOutside(B) {
                // eslint-disable-next-line no-new
                new B();
            },
        };

        const env = createVirtualEnvironment(window, window, { endowments });

        env.evaluate(`
            class B extends A {
                constructor() {
                    super();

                    expect(this.getFooFromOutside()).toBe(0);

                    this.foo = 9;

                    expect(this.foo).toBe(9);
                    expect(this.getFooFromOutside()).toBe(0);

                    this.incrementAFromOutside();

                    expect(this.foo).toBe(9);
                    expect(this.getFooFromOutside()).toBe(1);
                }
            }
            createBFromOutside(B);
            new B();
        `);
    });
});
