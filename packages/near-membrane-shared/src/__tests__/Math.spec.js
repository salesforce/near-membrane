import { MathMin } from '../../dist/index.mjs.js';

describe('Math', () => {
    it('MathMin', () => {
        expect(MathMin).toBe(Math.min);
    });
});
