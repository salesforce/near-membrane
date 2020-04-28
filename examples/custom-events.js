import { evaluateSourceText } from '../lib/browser-realm.js';

// listening for x from outer realm
document.body.addEventListener('x', function (e) {
    console.log(e, e.target, e.currentTarget);
});

evaluateSourceText(`
    debugger;

    const elm = document.createElement('p');
    document.body.appendChild(elm);

    const o = { x: 1 };
    class Bar extends CustomEvent {}

    // listening for x from secure env
    document.body.addEventListener('x', function (e) {
        console.log(e, e.target, e.currentTarget);
    });

    // leaking element reference and regular object via details
    const ev = new Bar('x', { detail: { elm, o } });

    document.body.dispatchEvent(ev);

    // checking class invariants
    console.log(CustomEvent.__proto__ === Event); // -> true
    console.log(CustomEvent.prototype.__proto__ === Event.prototype); // -> true
    console.log(CustomEvent.prototype.constructor === CustomEvent); // -> true
    console.log(Bar.__proto__ === CustomEvent); // -> true
    console.log(Bar.prototype.__proto__ === CustomEvent.prototype); // -> true
    console.log(Bar.prototype.constructor === Bar); // -> true
`);
