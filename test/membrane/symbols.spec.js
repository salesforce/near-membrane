import createVirtualEnvironment from '@locker/near-membrane-dom';

globalThis.regularSymbol = Symbol();
globalThis.symbolWithDescription = Symbol('symbol-with-desc');
globalThis.symbolWithKey = Symbol.for('symbol-with-key');

describe('Secure Membrane', () => {
    it('should support symbols', () => {
        expect.assertions(5);
        const evalScript = createVirtualEnvironment({ endowments: window });
        evalScript(`
            expect(typeof Symbol() === 'symbol').toBeTrue();
            expect(typeof Symbol.for('x') === 'symbol').toBeTrue();
            expect(Symbol.for('x') === Symbol.for('x')).toBeTrue();
            expect(Symbol.keyFor(Symbol.for('x'))).toBe('x');
            expect(Symbol().constructor.__proto__ === Function.prototype).toBeTrue();
            expect(Symbol().constructor.__proto__.constructor('return this')() === globalThis).toBeTrue();
        `);
    });
    it('should allow access to symbols defined in outer realm', function() {
        expect.assertions(3);
        const evalScript = createVirtualEnvironment({ endowments: window });
        evalScript(`
            expect(typeof globalThis.regularSymbol).toBe('symbol');
            expect(typeof globalThis.symbolWithDescription).toBe('symbol');
            expect(typeof globalThis.symbolWithKey).toBe('symbol');
        `);
    });
    it('should not leak outer realm global reference via symbols', function() {
        expect.assertions(2);
        const evalScript = createVirtualEnvironment({ endowments: window });
        evalScript(`
            expect(globalThis.regularSymbol.constructor).toBe(Symbol);
            expect(globalThis.regularSymbol.constructor.__proto__.constructor('return this')() === globalThis).toBeTrue();
        `);
    });
    it('should not leak outer realm global reference via Symbol.for()', function() {
        expect.assertions(3);
        const evalScript = createVirtualEnvironment({ endowments: window });
        evalScript(`
            expect(typeof Symbol.for('symbol-with-key')).toBe('symbol');
            expect(Symbol.for('symbol-with-key')).toBe(Symbol.for('symbol-with-key'));
            expect(Symbol.for('symbol-with-key').constructor === Symbol).toBeTrue();
        `);
    });

    it('blue Symbol class properties are inherited in red environments', () => {
        const symbol = Symbol.for('method');

        let successful = false;

        class Base {
            [symbol]() {
                successful = true;
            }
        }

        const secureEval = createVirtualEnvironment({ endowments: { Base, symbol }});
        secureEval(`
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
