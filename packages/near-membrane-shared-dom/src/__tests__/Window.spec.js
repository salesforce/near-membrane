import { rootWindow } from '../../dist/index';

describe('Window', () => {
    it('rootWindow', () => {
        expect(rootWindow).toBe(window);
    });
});
