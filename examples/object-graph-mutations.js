import createSecureEnvironment from '../lib/browser-realm.js';

globalThis.expect = (msg) => { 
    return {
        toBe(value) {
            console.log(msg, value);
        }
    }
};

globalThis.baz = { a:1, b: 2 };

const evalScript = createSecureEnvironment();

// checking the state of bar in the sandbox
evalScript(`    
    expect(Object.isExtensible(globalThis.bar)).toBe(true);
    expect(Object.isSealed(globalThis.bar)).toBe(false);
    expect(Object.isFrozen(globalThis.bar)).toBe(false);
`);
// freezing the raw value after being observed by the sandbox
Object.freeze(globalThis.baz);
expect(Object.isExtensible(globalThis.baz)).toBe(false);
expect(Object.isSealed(globalThis.baz)).toBe(true);
expect(Object.isFrozen(globalThis.baz)).toBe(true);
// verifying the state of the obj from within the sandbox
evalScript(`
    'use strict';
    debugger;
    baz.c = 3;
    expect(baz.c).toBe(3);
`);
expect(globalThis.baz.c).toBe(undefined); // because it is a sandboxed expando that doesn't leak out


evalScript(`
    'use strict';
    debugger;

    const originalProto = HTMLParagraphElement.prototype.__proto__;
    const newProto = {
        get x() { return 1; },
        y: 2,
        z: 3,
    };
    // making z non-writable
    Object.defineProperty(newProto, 'z', { writable: false });

    // replacing proto chain
    Object.setPrototypeOf(newProto, originalProto);
    Object.setPrototypeOf(HTMLParagraphElement.prototype, newProto);

    const elm = document.createElement('p');
    document.body.appendChild(elm);
    
    console.log('before x: ', elm.x);
    try {
        elm.x = 100;
    } catch (e) {
        console.error(e);
    }
    console.log('after x: ', elm.x);

    console.log('y: ', elm.y);
    try {
        elm.y = 200;
    } catch (e) {
        console.error(e);
    }
    console.log('after y: ', elm.y);

    console.log('z: ', elm.z);
    try {
        elm.z = 300;
    } catch (e) {
        console.error(e);
    }
    console.log('after z: ', elm.z);

    console.log('w: ', elm.w);
    try {
        elm.w = 400;
    } catch (e) {
        console.error(e);
    }
    console.log('after w: ', elm.w);
`);

// Mutations on the object graph in the sandbox do not leak into the outer realm
const elm = document.querySelector('p');
console.log('outer x: ', elm.x);
console.log('outer y: ', elm.y);
console.log('outer z: ', elm.z);
console.log('outer w: ', elm.w);
