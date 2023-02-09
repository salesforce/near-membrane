import { SUPPORTS_SHADOW_REALM } from '@locker/near-membrane-shared';
import createVirtualEnvironment from '@locker/near-membrane-dom';

if (SUPPORTS_SHADOW_REALM) {
    const useShadowRealm = true;
    const endowments = { a: 1 };
    // To run this test file:
    //
    // (First run)
    // 1. Open the latest version of Firefox and type 'about:config' in the address bar.
    // 2. Click "Accept risk and continue"
    // 3. Type "shadow" into the search bar
    // 4. On the line containing "javascript.options.experimental.shadow_realms", click the "toggle" button.
    // 5. Restart Firefox if prompted to do so.
    //
    // Move to your terminal and run `yarn build` or `yarn build:dev`
    //
    // (Subsequent runs)
    // 1. In the terminal, type:
    //      npx karma start karma.config.js --browsers Firefox --match "test/environment/shadowrealm.spec.js"
    //
    describe('ShadowRealm', () => {
        it('can create a virtual environment backed by a ShadowRealm', () => {
            expect(() => {
                createVirtualEnvironment(window, {
                    endowments,
                    useShadowRealm,
                });
            }).not.toThrow();
        });
    });
}
