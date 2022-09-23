import { selfWindow } from '../../dist/index';

describe('Window', () => {
    it('selfWindow', () => {
        expect(selfWindow).toBe(window);
    });
});
