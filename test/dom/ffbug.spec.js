import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('FF BugFix 543435', () => {
    it('should preserve the document reference in the next turn', (done) => {
        // expect.assertions(3);
        const evalScript = createVirtualEnvironment({
            endowments: Object.assign({}, window, {
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
