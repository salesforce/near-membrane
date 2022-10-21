import { NumberIsFinite, NumberIsInteger } from '../../dist/index';

describe('Number', () => {
    it('NumberIsFinite', () => {
        expect(NumberIsFinite).toBe(Number.isFinite);
    });
    it('NumberIsInteger', () => {
        expect(NumberIsInteger).toBe(Number.isInteger);
    });
});
