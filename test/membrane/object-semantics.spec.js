import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('Blue Proxies', () => {
    it('should allow writable objects to change', () => {
        expect.assertions(9);

        let obj;
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({
                expect,
                saveObject(o) {
                    obj = o;
                },
            }),
        });

        env.evaluate(`
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
        // eslint-disable-next-line no-unused-expressions
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
