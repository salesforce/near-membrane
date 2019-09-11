import { SecureEnvironment } from '../lib/environment.js';

const descriptors = Object.getOwnPropertyDescriptors(window);
const env = new SecureEnvironment({
    global: window,
    descriptors,
});

// listening for x from outer realm
document.body.addEventListener('x', function (e) {
    console.log(e, e.target, e.currentTarget);
});

env.evaluate(`
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
    document.querySelector('x-foo').fooProtoMethod(); // yields 1

    // checking class invariants
    HTMLElement.__proto__ === Event; // yields true
    HTMLElement.prototype.__proto__ === Event.prototype; // yields true
    HTMLElement.prototype.constructor === HTMLElement; // yields true
    Foo.__proto__ === HTMLElement; // yields true
    Foo.prototype.__proto__ === HTMLElement.prototype; // yields true
    Foo.prototype.constructor === Foo; // yields true
`);

document.querySelector('x-foo').fooProtoMethod(); // yields 1
