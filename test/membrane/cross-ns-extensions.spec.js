import createSecureEnvironment from '@locker/near-membrane-dom';

class Base {
    base() {
        return 'from base';
    }
}
let Foo;
function saveFoo(f) {
    Foo = f;
}

const evalScript = createSecureEnvironment({ endowments: { Base, saveFoo }});
evalScript(`
    class Foo extends Base {
        foo() {
            return 'from foo';
        }
    }
    saveFoo(Foo);
`);

const endowments = {
    Foo,
    expect
};

describe('The membrane', () => {
    it('should allow expandos on endowments inside the sandbox', function() {
        // expect.assertions(4);
        const evalScript = createSecureEnvironment({ endowments });
        evalScript(`
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
