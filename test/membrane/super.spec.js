import createVirtualEnvironment from '@locker/near-membrane-dom';

let exported;
function exportData(arg) {
    exported = arg;
}

it('super should behave as expected in sandbox', () => {
    const secureEvalOne = createVirtualEnvironment(window, { endowments: { exportData } });
    secureEvalOne(`
    exportData(class Foo {
      constructor() {
        this.value = 'base';
      }
    });`);
    const secureEvalTwo = createVirtualEnvironment(window, {
        endowments: { expect, Foo: exported },
    });
    secureEvalTwo(`
    class Bar extends Foo {
      constructor() {
        super();
        expect(this.value).toBe('base');
        super.value = 'bar';
        expect(super.value).toBeUndefined();
        expect(this.value).toBe('bar');
      }
    }

    new Bar();
  `);
});
