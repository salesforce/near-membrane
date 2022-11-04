import { rootWindow } from '../../dist/index.mjs.js';

describe('Window', () => {
    it('rootWindow', () => {
        expect(rootWindow).toBe(window);
    });
});
