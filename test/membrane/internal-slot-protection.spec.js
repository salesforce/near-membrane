import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('membrane', () => {
    it('should prevent attacks that are changing the prototype for impersonation', () => {
        expect.assertions(4);

        const { value: setAttribute } = Object.getOwnPropertyDescriptor(
            Element.prototype,
            'setAttribute'
        );

        const distortionMap = new Map([
            [
                setAttribute,
                function (attributeName, value) {
                    expect(attributeName).toBe('rel');
                    expect(value).toBe('import');
                    expect(this instanceof HTMLLinkElement).toBeTrue();
                },
            ],
        ]);

        const env = createVirtualEnvironment(window, {
            distortionCallback(v) {
                return distortionMap.get(v) ?? v;
            },
            endowments: Object.getOwnPropertyDescriptors({ expect }),
        });

        env.evaluate(`
            'use strict';

            const { prototype: originalProto } = HTMLLinkElement;
            const link = document.createElement('link');
            link.__proto__ = HTMLElement.prototype;
            // this attack is trying to change the proto chain, and therefore the instanceof checks and such on distortions,
            // but it doesn't work because the object graph mutation for the prototype is only visible inside the sandbox.
            link.setAttribute('rel', 'import');
            expect(link.rel).toBe(undefined);
        `);
    });
});
