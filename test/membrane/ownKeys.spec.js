import createSecureEnvironment from '../../lib/browser-realm.js';

let exported;
function exportData(arg) {
  exported = arg;
}

const oneScript = `
    exportData([
      class Foo {},
      function() {'use strict'}
    ]);
`;

const twoScript = `
    exportData(imported.map(Reflect.ownKeys));
`;

it('does not throw ownKeys trap invariant for classes or strict mode functions', () => {
  const secureEvalOne = createSecureEnvironment(undefined, { exportData });
  secureEvalOne(oneScript);
  const secureEvalTwo = createSecureEnvironment(
    undefined,
    { exportData, imported: exported }
  );
  secureEvalTwo(twoScript);
  const matcher = jasmine.arrayWithExactContents(['length', 'name', 'prototype']);
  exported.forEach(ownKeys => {
    expect(ownKeys).toEqual(matcher);
  });
});
