import { evaluateSourceText } from '../../lib/browser-realm.js';

const endowments = {
    regularSymbol: Symbol(),
    symbolWithDescription: Symbol('symbol-with-desc'),
    symbolWithKey: Symbol.for('symbol-with-key'),
    expect,
};

describe('Secure Membrane', () => {
    it('should support symbols', () => {
        // expect.assertions(5);
        evaluateSourceText(`
            expect(typeof Symbol() === 'symbol').toBeTrue();
            expect(typeof Symbol.for('x') === 'symbol').toBeTrue();
            expect(Symbol.for('x') === Symbol.for('x')).toBeTrue();
            expect(Symbol.keyFor(Symbol.for('x'))).toBe('x');
            expect(Symbol().constructor.__proto__ === Function.prototype).toBeTrue();
            expect(Symbol().constructor.__proto__.constructor('return this')() === globalThis).toBeTrue();
        `, { endowments });
    });
    it('should allow access to symbols defined in outer realm', function() {
        // expect.assertions(3);
        evaluateSourceText(`
            expect(typeof globalThis.regularSymbol).toBe('symbol');
            expect(typeof globalThis.symbolWithDescription).toBe('symbol');
            expect(typeof globalThis.symbolWithKey).toBe('symbol');
        `, { endowments });
    });
    it('should not leak outer realm global reference via symbols', function() {
        // expect.assertions(2);
        evaluateSourceText(`
            expect(globalThis.regularSymbol.constructor).toBe(Symbol);
            expect(globalThis.regularSymbol.constructor.__proto__.constructor('return this')() === globalThis).toBeTrue();
        `, { endowments });
    });
    it('should not leak outer realm global reference via Symbol.for()', function() {
        // expect.assertions(3);
        evaluateSourceText(`
            expect(typeof Symbol.for('symbol-with-key')).toBe('symbol');
            expect(Symbol.for('symbol-with-key')).toBe(Symbol.for('symbol-with-key'));
            expect(Symbol.for('symbol-with-key').constructor === Symbol).toBeTrue();
        `, { endowments });
    });
});
