import createSecureEnvironment from '@locker/dom-membrane';

describe('FF BugFix 543435', () => {
    it('should preserve the document reference in the next turn', function(done) {
        // expect.assertions(3);
        const evalScript = createSecureEnvironment({
            endowments: {
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
            },
            keepAlive: true,
        });
        evalScript(`
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
