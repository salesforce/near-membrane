import { SecureDOMEnvironment } from './realm';

const r1 = new SecureDOMEnvironment();
const r2 = new SecureDOMEnvironment();

r1.evaluate(`
    const elm = document.createElement('p');
    elm.className = 'r1';
    elm.foo = 1;
    document.body.appendChild(elm);
`);
r2.evaluate(`
    const elm = document.createElement('o');
    elm.className = 'r2';
    document.body.insertBefore(elm, null);
`);

console.log(document.body.innerHTML);
const d = r1.window.document;
const b = d.body;
const i = b.innerHTML;
console.log(i);
console.log(r2.window.document.body.innerHTML);

// more advanced interations

console.log(r1.window.document.body.querySelector('p').foo); // yields 1 because expandos are only in the realm obj graph
console.log(window.document.body.querySelector('p').foo); // yields undefined

r1.window.document.body.querySelector('p').innerHTML = 'click here'
r1.window.document.body.querySelector('p').addEventListener('click', function (e) {
    debugger;
    console.log(e);
});