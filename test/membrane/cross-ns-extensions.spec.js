import createVirtualEnvironment from '@locker/near-membrane-dom';

class Base {
    // eslint-disable-next-line class-methods-use-this
    base() {
        return 'from base';
    }
}
let Foo;
function saveFoo(f) {
    Foo = f;
}

const env = createVirtualEnvironment(window, window, { endowments: { Base, saveFoo } });
env.evaluate(`
    class Foo extends Base {
        foo() {
            return 'from foo';
        }
    }
    saveFoo(Foo);
`);

const endowments = {
    Foo,
    expect,
};

describe('The membrane', () => {
    it('should allow expandos on endowments inside the sandbox', () => {
        expect.assertions(4);
        const env = createVirtualEnvironment(window, window, { endowments });
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
