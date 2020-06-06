import createSecureEnvironment from '../../lib/browser-realm.js'

it('super.value reads should return value from current sandbox', () => {
  let exported
  const exportValue = (arg) => {
    exported = arg;
  }

  const secureEvalOne = createSecureEnvironment(undefined, { exportValue });
  secureEvalOne(
    `class Foo { 
        constructor() { 
            this.value = "base" ;
        } 
    }
    exportValue(Foo);`,
  )
  const Foo = exported;

  const secureEvalTwo = createSecureEnvironment(undefined, { expect, Foo });
  secureEvalTwo(`
    class Bar extends Foo {
        constructor() {
            super();
            super.value = 'bar';
            expect(super.value).toBe('bar');
        }
    }

    new Bar();
  `)
})
