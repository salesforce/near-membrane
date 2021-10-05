import createVirtualEnvironment from '@locker/near-membrane-dom';

let exported;
function exportData(arg) {
    exported = arg;
}

it('super should behave as expected in sandbox', () => {
    const envOne = createVirtualEnvironment(window, window, { endowments: { exportData } });
    envOne.evaluate(`
    exportData(class Foo {
      constructor() {
        this.value = 'base';
      }
    });`);
    const envTwo = createVirtualEnvironment(window, window, {
        endowments: { expect, Foo: exported },
    });
    envTwo.evaluate(`
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
