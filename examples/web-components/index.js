import createSecureEnvironment from '@locker/near-membrane-dom';

// getting reference to the function to be distorted
const { get: ShadowRootHostGetter } = Object.getOwnPropertyDescriptor(ShadowRoot.prototype, 'host');
const { assignedNodes, assignedElements } = HTMLSlotElement.prototype;

const distortionMap = new Map();
distortionMap.set(ShadowRootHostGetter, _ => { throw new Error(`Forbidden`); });
distortionMap.set(assignedNodes, _ => { throw new Error(`Forbidden`); });
distortionMap.set(assignedElements, _ => { throw new Error(`Forbidden`); });

function evaluateInNewSandbox(sourceText) {
    const evalScript = createSecureEnvironment({ distortionMap });
    evalScript(sourceText);
}

document.querySelector('button').addEventListener('click', function (e) {
    const sourceText = document.querySelector('textarea').value;
    evaluateInNewSandbox(sourceText);
});
