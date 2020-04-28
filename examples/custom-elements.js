import { evaluateSourceText } from '../lib/browser-realm.js';

// listening for x from outer realm
document.body.addEventListener('x', function (e) {
    console.log(e, e.target, e.currentTarget);
});

evaluateSourceText(`
    debugger;

    // custom elements
    class Foo extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
            this.shadowRoot.innerHTML = '<p>inside the shadow</p>';
        }
        fooProtoMethod() {
            return 1;
        }
    }
    customElements.define('x-foo', Foo);
    const elm = document.createElement('x-foo');
    elm.className = 'r3';
    document.body.insertBefore(elm, null);

    console.log(document.querySelector('x-foo').fooProtoMethod()); // -> 1

    // checking class invariants
    console.log(HTMLElement.__proto__ === Element); // -> true
    console.log(HTMLElement.prototype.__proto__ === Element.prototype); // -> true
    console.log(HTMLElement.prototype.constructor === HTMLElement); // -> true
    console.log(Foo.__proto__ === HTMLElement); // -> true
    console.log(Foo.prototype.__proto__ === HTMLElement.prototype); // -> true
    console.log(Foo.prototype.constructor === Foo); // -> true
`);

document.querySelector('x-foo').fooProtoMethod(); // -> 1
