import { SecureEnvironment } from '../lib/environment.js';

const descriptors = Object.getOwnPropertyDescriptors(window);
const env = new SecureEnvironment({
    global: window,
    descriptors,
});

env.evaluate(`
    debugger;

    const elm = document.createElement('p');
    elm.className = 'r1';
    elm.foo = 1; // adding expando to p element
    document.body.appendChild(elm);

    // expandos are available inside the secure env
    document.querySelector('p').foo; // fields 1
`);

// expandos are not available in the outer realm
document.querySelector('p').foo; // fields undefined
