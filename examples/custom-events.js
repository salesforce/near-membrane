import createSecureEnvironment from '../lib/browser-realm.js';

const secureGlobalThis = createSecureEnvironment();

// listening for x from outer realm
document.body.addEventListener('x', function (e) {
    console.log(e, e.target, e.currentTarget);
});

secureGlobalThis.eval(`
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
    CustomEvent.__proto__ === Event; // yields true
    CustomEvent.prototype.__proto__ === Event.prototype; // yields true
    CustomEvent.prototype.constructor === CustomEvent; // yields true
    Bar.__proto__ === CustomEvent; // yields true
    Bar.prototype.__proto__ === CustomEvent.prototype; // yields true
    Bar.prototype.constructor === Bar; // yields true
`);
