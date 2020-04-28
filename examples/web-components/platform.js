import { evaluateSourceText } from '../../lib/browser-realm.js';

// getting reference to the function to be distorted
const { get: ShadowRootHostGetter } = Object.getOwnPropertyDescriptor(ShadowRoot.prototype, 'host');
const { assignedNodes, assignedElements } = HTMLSlotElement.prototype;

const distortions = new Map();
distortions.set(ShadowRootHostGetter, _ => { throw new Error(`Forbidden`); });
distortions.set(assignedNodes, _ => { throw new Error(`Forbidden`); });
distortions.set(assignedElements, _ => { throw new Error(`Forbidden`); });

function evaluateInNewSandbox(sourceText) {
    evaluateSourceText(sourceText, { distortions });
}

document.querySelector('button').addEventListener('click', function (e) {
    const sourceText = document.querySelector('textarea').value;
    evaluateInNewSandbox(sourceText);
});
