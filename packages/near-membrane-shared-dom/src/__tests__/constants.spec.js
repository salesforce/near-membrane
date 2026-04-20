import { IS_CHROMIUM_BROWSER, IS_OLD_CHROMIUM_BROWSER } from '../../dist/index.mjs.js';

describe('constants', () => {
    it('IS_CHROMIUM_BROWSER is a boolean', () => {
        expect(typeof IS_CHROMIUM_BROWSER).toBe('boolean');
    });
    it('IS_OLD_CHROMIUM_BROWSER is a boolean', () => {
        expect(typeof IS_OLD_CHROMIUM_BROWSER).toBe('boolean');
    });
    it('IS_OLD_CHROMIUM_BROWSER implies IS_CHROMIUM_BROWSER', () => {
        if (IS_OLD_CHROMIUM_BROWSER) {
            expect(IS_CHROMIUM_BROWSER).toBe(true);
        }
    });
});
