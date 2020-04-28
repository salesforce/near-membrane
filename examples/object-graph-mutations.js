import { evaluateSourceText } from '../lib/browser-realm.js';

evaluateSourceText(`
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
