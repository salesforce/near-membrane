import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('Symbols', () => {
    const envOptions = {
        endowments: Object.getOwnPropertyDescriptors({ expect }),
        globalObjectShape: window,
    };

    it('should be supported', () => {
        expect.assertions(6);

        const env = createVirtualEnvironment(window, envOptions);

        env.evaluate(`
            expect(typeof Symbol() === 'symbol').toBeTrue();
            expect(typeof Symbol.for('x') === 'symbol').toBeTrue();
            expect(Symbol.for('x') === Symbol.for('x')).toBeTrue();
            expect(Symbol.keyFor(Symbol.for('x'))).toBe('x');
            expect(Symbol().constructor.__proto__ === Function.prototype).toBeTrue();
            expect(Symbol().constructor.__proto__.constructor('return this')() === globalThis).toBeTrue();
        `);
    });
    it('should be accessible when defined in the outer realm', () => {
        expect.assertions(3);

        // eslint-disable-next-line symbol-description
        globalThis.regularSymbol = Symbol();
        globalThis.symbolWithDescription = Symbol('symbol-with-desc');
        globalThis.symbolWithKey = Symbol.for('symbol-with-key');

        const env = createVirtualEnvironment(window, envOptions);

        env.evaluate(`
            expect(typeof globalThis.regularSymbol).toBe('symbol');
            expect(typeof globalThis.symbolWithDescription).toBe('symbol');
            expect(typeof globalThis.symbolWithKey).toBe('symbol');
        `);
    });
    it('should not leak outer realm global references', () => {
        expect.assertions(2);

        // eslint-disable-next-line symbol-description
        globalThis.regularSymbol = Symbol();

        const env = createVirtualEnvironment(window, envOptions);

        env.evaluate(`
            expect(globalThis.regularSymbol.constructor).toBe(Symbol);
            expect(globalThis.regularSymbol.constructor.__proto__.constructor('return this')() === globalThis).toBeTrue();
        `);
    });
    it('should not leak outer realm global references via Symbol.for()', () => {
        expect.assertions(3);

        const env = createVirtualEnvironment(window, envOptions);

        env.evaluate(`
            expect(typeof Symbol.for('symbol-with-key')).toBe('symbol');
            expect(Symbol.for('symbol-with-key')).toBe(Symbol.for('symbol-with-key'));
            expect(Symbol.for('symbol-with-key').constructor === Symbol).toBeTrue();
        `);
    });
    it('blue class properties are inherited in red realms', () => {
        const symbol = Symbol('method');
        let successful = false;

        class Base {
            // eslint-disable-next-line class-methods-use-this
            [symbol]() {
                successful = true;
            }
        }

        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ Base, symbol }),
        });

        env.evaluate(`
            class Bar extends Base {
                constructor() {
                    super();
                    this.barClass = 'bar';
                    this[symbol]();
                }
            }
            new Bar();
        `);

        expect(successful).toBe(true);
    });
});
