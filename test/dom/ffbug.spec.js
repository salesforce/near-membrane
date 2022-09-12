import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('FF BugFix 543435', () => {
    it('should preserve the document reference in the next turn', (done) => {
        expect.assertions(3);

        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({
                validateSyncDocumentReference(redDoc) {
                    expect(redDoc).toBe(document);
                },
                validateMicroTaskDocumentReference(redDoc) {
                    expect(redDoc).toBe(document);
                },
                validateMacroTaskDocumentReference(redDoc) {
                    expect(redDoc).toBe(document);
                    done();
                },
            }),
            keepAlive: true,
        });

        env.evaluate(`
            validateSyncDocumentReference(document);
            Promise.resolve().then(() => {
                validateMicroTaskDocumentReference(document);
            });
            setTimeout(() => {
                validateMacroTaskDocumentReference(document);
            }, 1);
        `);
    });
});
