import { evaluateSourceText } from '../lib/browser-realm.js';

evaluateSourceText(`
    debugger;

    const elm = document.createElement('p');
    elm.className = 'r1';
    elm.foo = 1; // adding expando to p element
    document.body.appendChild(elm);

    // expandos are available inside the secure env
    console.log(document.querySelector('p').foo); // -> 1
`);

console.log(document.body.outerHTML);

// expandos are not available in the outer realm
console.log(document.querySelector('p').foo); // -> undefined
