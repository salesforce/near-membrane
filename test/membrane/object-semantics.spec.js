import createSecureEnvironment from '@locker/near-membrane-dom';

let obj;
function saveObject(o) {
    obj = o;
}

const endowments = {
    saveObject,
    expect
};

describe('Blue Proxies', () => {
    it('should be preserved the JS Object semantics by allowing writable objects to change', () => {
        'use strict';
        // expect.assertions(9);
        const evalScript = createSecureEnvironment({ endowments });
        evalScript(`
            'use strict';
            const obj = {
                mutate() {
                    Object.defineProperty(this, 'x', {
                        value: 3,
                        writable: false,
                    });
                }
            };
            Object.defineProperty(obj, 'x', {
                value: 1,
                writable: true,
            });
            saveObject(obj);
        `);
        expect(obj.x).toBe(1);
        expect(Object.getOwnPropertyDescriptor(obj, 'x').value).toBe(1);
        obj.x = 2;
        expect(obj.x).toBe(2);
        expect(Object.getOwnPropertyDescriptor(obj, 'x').value).toBe(2);
        obj.mutate();
        obj.x;
        expect(obj.x).toBe(3);
        expect(Object.getOwnPropertyDescriptor(obj, 'x').value).toBe(3);
        expect(() => {
            obj.x = 4;
        }).toThrow();
        expect(obj.x).toBe(3);
        expect(Object.getOwnPropertyDescriptor(obj, 'x').value).toBe(3);
    });
}); 
