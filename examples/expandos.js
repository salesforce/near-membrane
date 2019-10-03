import createSecureEnvironment from '../lib/browser-realm.js';

const secureGlobalThis = createSecureEnvironment();
const elm = secureGlobalThis.document.createElement('p');
secureGlobalThis.document.body.appendChild(elm);
console.log(document.body.outerHTML);
console.log(secureGlobalThis.document.body.outerHTML);
secureGlobalThis.eval(`
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
