import { NumberIsFinite, NumberIsInteger } from '../../dist/index.mjs.js';

describe('Number', () => {
    it('NumberIsFinite', () => {
        expect(NumberIsFinite).toBe(Number.isFinite);
    });
    it('NumberIsInteger', () => {
        expect(NumberIsInteger).toBe(Number.isInteger);
    });
});
