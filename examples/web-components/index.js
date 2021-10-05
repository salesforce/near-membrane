import createVirtualEnvironment from '@locker/near-membrane-dom';

// getting reference to the function to be distorted
const { get: ShadowRootHostGetter } = Object.getOwnPropertyDescriptor(ShadowRoot.prototype, 'host');
const { assignedNodes, assignedElements } = HTMLSlotElement.prototype;

const distortionMap = new Map();
distortionMap.set(ShadowRootHostGetter, () => {
    throw new Error(`Forbidden`);
});
distortionMap.set(assignedNodes, () => {
    throw new Error(`Forbidden`);
});
distortionMap.set(assignedElements, () => {
    throw new Error(`Forbidden`);
});

function evaluateInNewSandbox(sourceText) {
    const distortionCallback = (v) => distortionMap.get(v) || v;
    const env = createVirtualEnvironment(window, window, { distortionCallback });
    env.evaluate(sourceText);
}

document.querySelector('button').addEventListener('click', function (e) {
    const sourceText = document.querySelector('textarea').value;
    evaluateInNewSandbox(sourceText);
});
