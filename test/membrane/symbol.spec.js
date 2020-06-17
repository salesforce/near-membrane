import createSecureEnvironment from '../../lib/browser-realm.js'

it('blue Symbol class properties are inherited in red environments', () => {
    const symbol = Symbol.for('method');
    
    let successful = false;
    
    class Base {
        [symbol]() {
            successful = true;
        }
    }

    const secureEval = createSecureEnvironment(undefined, { Base, symbol });
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