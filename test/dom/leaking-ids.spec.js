import { evaluateSourceText } from '../../lib/browser-realm.js';

// clobbering before creating any sandbox to mimic the creation of a sandbox after clobbering
var object = document.createElement('object');
object.id = 'cookie';
document.body.appendChild(object);

describe('clobbering cookie on document', () => {
    it('should not be possible in the sandbox', function() {
        return Promise.resolve(() => {
            // expect.assertions(2);
            evaluateSourceText(`
                expect(document.cookie instanceof HTMLObjectElement).toBeFalse(); // not-clobbered in the sandbox
            `);
            expect(document.cookie instanceof HTMLObjectElement).toBeTrue(); // clobbered on the real document
        });
    });
});

describe('clobbering cookie on window', () => {
    it('should not be possible in the sandbox', function() {
        return Promise.resolve(() => {
            // expect.assertions(2);
            evaluateSourceText(`
                expect(window.cookie instanceof HTMLObjectElement).toBeFalse(); // not-clobbered in the sandbox
            `);
            expect(window.cookie instanceof HTMLObjectElement).toBeTrue(); // clobbered on the real document
        });
    });
});
