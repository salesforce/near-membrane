import createVirtualEnvironment from '@locker/near-membrane-dom';

let exported;
function exportData(arg) {
    exported = arg;
}

it('does not throw ownKeys trap invariant for classes or strict mode functions', () => {
    const envOne = createVirtualEnvironment(window, { endowments: { exportData } });
    envOne.evaluate(`
    exportData([
      class Foo {},
      function() {'use strict'}
    ]);
    `);
    const envTwo = createVirtualEnvironment(window, {
        endowments: { exportData, imported: exported },
    });
    envTwo.evaluate(`
    exportData(imported.map(Reflect.ownKeys));
    `);
    const matcher = jasmine.arrayWithExactContents(['length', 'name', 'prototype']);
    exported.forEach((ownKeys) => {
        expect(ownKeys).toEqual(matcher);
    });
});
