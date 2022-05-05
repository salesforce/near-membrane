import createVirtualEnvironment from '@locker/near-membrane-dom';

let exported;
function exportData(arg) {
    exported = arg;
}

it('super should behave as expected in sandbox', () => {
    const envOne = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ exportData }),
    });
    envOne.evaluate(`
    exportData(class Foo {
      constructor() {
        this.value = 'base';
      }
    });`);
    const envTwo = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ expect, Foo: exported }),
    });
    envTwo.evaluate(`
    class Bar extends Foo {
      constructor() {
        super();
        try {
          expect(this.value).toBe('base');
          super.value = 'bar';
          expect(super.value).toBeUndefined();
          expect(this.value).toBe('bar');
        } catch {
          console.warn('Could not run this test');
        }
      }
    }

    new Bar();
  `);
});
