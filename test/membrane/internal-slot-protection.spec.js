import createSecureEnvironment from '@locker/near-membrane-dom';

describe('membrane', () => {
    it('should prevent attacks that are changing the prototype for impersonation', function() {
        // expect.assertions(4);
        const { set } = Object.getOwnPropertyDescriptor(Element.prototype, 'setAttribute');
        const distortionMap = new Map(set, function (attributeName, value) {
            expect(attributeName).toBe('rel');
            expect(value).toBe('import');
            expect(this instanceof HTMLLinkElement).toBeTrue();
        });
        const evalScript = createSecureEnvironment({ distortionMap, endowments: window });
        evalScript(`
            'use strict';

            const originalProto = HTMLLinkElement.prototype;
            const link = document.createElement('link');
            link.__proto__ = HTMLElement.prototype;
            // this attack is trying to change the proto chain, and therefore the instanceof checks and such on distortions,
            // but it doesn't work because the object graph mutation for the prototype is only visible inside the sandbox.
            link.setAttribute('rel', 'import');
            expect(link.rel).toBe(undefined);
        `);
    });
});
