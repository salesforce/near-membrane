import createSecureEnvironment from '../../lib/browser-realm.js';

let exported;
function exportData(arg) {
  exported = arg;
}

it('does not throw ownKeys trap invariant for classes or strict mode functions', () => {
  const secureEvalOne = createSecureEnvironment({ endowments: { exportData }});
  secureEvalOne(`
    exportData([
      class Foo {},
      function() {'use strict'}
    ]);
  `);
  const secureEvalTwo = createSecureEnvironment({
    endowments: { exportData, imported: exported }
  });
  secureEvalTwo(`
    exportData(imported.map(Reflect.ownKeys));
  `);
  const matcher = jasmine.arrayWithExactContents(['length', 'name', 'prototype']);
  exported.forEach(ownKeys => {
    expect(ownKeys).toEqual(matcher);
  });
});
