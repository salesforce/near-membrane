import {
    clearGaterEnabledFeatures,
    deregisterGaterEnabledFeatures,
    ENABLE_MAX_PERF_MODE_GATE,
    ENABLE_SANDBOXED_SAMEORIGIN_IFRAME_GATE,
    isAllowedToOverrideGaterEnabledFeature,
    isGaterEnabledFeature,
    isNotAllowedToOverrideGaterEnabledFeature,
    registerGaterEnabledFeatures,
} from '../../dist/index.mjs.js';

describe('GaterFeatures', () => {
    it('clearGaterEnabledFeatures', () => {
        registerGaterEnabledFeatures(['com.salesforce.locker.foo', 'com.salesforce.locker.bar']);
        expect(isGaterEnabledFeature('foo')).toBe(true);
        expect(isGaterEnabledFeature('bar')).toBe(true);
        clearGaterEnabledFeatures();
        expect(isGaterEnabledFeature('foo')).toBe(false);
        expect(isGaterEnabledFeature('bar')).toBe(false);
    });
    it('registerGaterEnabledFeatures', () => {
        expect(() => {
            registerGaterEnabledFeatures();
        }).not.toThrow();
        registerGaterEnabledFeatures(['com.salesforce.locker.foo', 'com.salesforce.locker.bar']);
        expect(isGaterEnabledFeature('foo')).toBe(true);
        expect(isGaterEnabledFeature('bar')).toBe(true);
    });
    it('deregisterGaterEnabledFeatures', () => {
        expect(() => {
            deregisterGaterEnabledFeatures();
        }).not.toThrow();
        registerGaterEnabledFeatures([
            'com.salesforce.locker.hello',
            'com.salesforce.locker.goodbye',
        ]);
        expect(isGaterEnabledFeature('hello')).toBe(true);
        expect(isGaterEnabledFeature('goodbye')).toBe(true);
        deregisterGaterEnabledFeatures([
            'com.salesforce.locker.hello',
            'com.salesforce.locker.goodbye',
        ]);
        expect(isGaterEnabledFeature('hello')).toBe(false);
        expect(isGaterEnabledFeature('goodbye')).toBe(false);
    });
    it('isGaterEnabledFeature', () => {
        registerGaterEnabledFeatures(['com.salesforce.locker.foo']);
        expect(isGaterEnabledFeature('foo')).toBe(true);
        expect(isGaterEnabledFeature('xyz')).toBe(false);
    });

    describe('Gate Override', () => {
        // These are permanent tests
        it('isAllowedToOverrideGaterEnabledFeature', () => {
            expect(
                isAllowedToOverrideGaterEnabledFeature('foo', '$lwsBogusFeatureDisabledTrue')
            ).toBe(true);
            expect(isAllowedToOverrideGaterEnabledFeature('foo', 'does not exist')).toBe(false);
        });
        it('isNotAllowedToOverrideGaterEnabledFeature', () => {
            expect(
                isNotAllowedToOverrideGaterEnabledFeature('foo', '$lwsBogusFeatureDisabledFalse')
            ).toBe(true);
            expect(isAllowedToOverrideGaterEnabledFeature('foo', 'does not exist')).toBe(false);
        });

        const namespaces = [
            'devops001gs0',
            'devops002gs0',
            'devopsimpkg_',
            'devopsimpkg',
            'devopsimpkg11__',
            'devopsimpkg11_',
            'devopsimpkgX_',
            'omnistudio',
        ];
        // These are only needed for the life of the gates listed
        for (const gate of [ENABLE_MAX_PERF_MODE_GATE, ENABLE_SANDBOXED_SAMEORIGIN_IFRAME_GATE]) {
            it(`isAllowedToOverrideGaterEnabledFeature("${gate}")`, () => {
                expect(isAllowedToOverrideGaterEnabledFeature('foo', gate)).toBe(false);
                for (const namespace of namespaces) {
                    expect(isAllowedToOverrideGaterEnabledFeature(namespace, gate)).toBe(true);
                }
            });
            it(`isNotAllowedToOverrideGaterEnabledFeature("${gate}")`, () => {
                expect(isNotAllowedToOverrideGaterEnabledFeature('foo', gate)).toBe(true);
                for (const namespace of namespaces) {
                    expect(isNotAllowedToOverrideGaterEnabledFeature(namespace, gate)).toBe(false);
                }
            });
        }
    });
});
