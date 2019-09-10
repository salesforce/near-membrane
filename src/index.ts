import { SecureDOMEnvironment } from './environment';

const r1 = new SecureDOMEnvironment();
r1.evaluate(`
    const elm = document.createElement('p');
    elm.className = 'r1';
    elm.foo = 1;
    document.body.appendChild(elm);
`);

const r2 = new SecureDOMEnvironment();
r2.evaluate(`
    const elm = document.createElement('o');
    elm.className = 'r2';
    document.body.insertBefore(elm, null);
`);

document.body.addEventListener('x', function (e) {
    console.log(e, e.target, e.currentTarget);
});

const b1 = CustomEvent.__proto__ === Event;
const b2 = CustomEvent.prototype.__proto__ === Event.prototype;
const b3 = CustomEvent.prototype.constructor === CustomEvent;

const r3 = new SecureDOMEnvironment();
r3.evaluate(`
    // custom events
    class Bar extends CustomEvent {}
    document.body.addEventListener('x', function (e) {
        console.log(e, e.target, e.currentTarget);
    });
    const ev = new Bar('x');
    document.body.dispatchEvent(ev);

    // custom elements
    class Foo extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
            this.shadowRoot.innerHTML = '<p>inside the shadow</p>';
        }
        fooProtoMethod() {}
    }
    customElements.define('x-foo', Foo);
    const elm = document.createElement('x-foo');
    elm.className = 'r3';
    document.body.insertBefore(elm, null);
`);

const c1 = r3.window.CustomEvent.__proto__ === r3.window.Event;
const ce = r3.window.CustomEvent;
const e = r3.window.Event;
const p1 = ce.prototype;
const p2 = e.prototype;
const c2 = ce.prototype.__proto__ === e.prototype;
const c3 = ce.prototype.constructor === ce;

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
    console.log(e);
});