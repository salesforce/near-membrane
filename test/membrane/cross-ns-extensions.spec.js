import createVirtualEnvironment from '@locker/near-membrane-dom';

class Base {
    // eslint-disable-next-line class-methods-use-this
    base() {
        return 'from base';
    }
}

let Foo;
createVirtualEnvironment(window, {
    endowments: Object.getOwnPropertyDescriptors({
        Base,
        saveFoo(f) {
            Foo = f;
        },
    }),
}).evaluate(`
    class Foo extends Base {
        foo() {
            return 'from foo';
        }
    }
    saveFoo(Foo);
`);

describe('The membrane', () => {
    it('should allow expandos on endowments inside the sandbox', () => {
        expect.assertions(4);

        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({
                Foo,
                expect,
            }),
        });

        env.evaluate(`
            'use strict';
            expect(Foo.prototype.base()).toBe('from base');
            expect(Foo.prototype.foo()).toBe('from foo');
            class Bar extends Foo {
                foo() {
                    return 'from bar as override';
                }
            }
            expect(new Bar().base()).toBe('from base');
            expect(new Bar().foo()).toBe('from bar as override');
        `);
    });
});
