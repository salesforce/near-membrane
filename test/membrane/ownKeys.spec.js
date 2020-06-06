import createSecureEnvironment from '../../lib/browser-realm.js'

let exported
function exportData(arg) {
  exported = exportData
}

const oneScript = `
    class Foo {}
    Object.defineProperty(Foo, Symbol.for('@@lockerLiveValue'), {enumerable: true});
    exportData(Foo);
`

const twoScript = `
    const symbols = Object.getOwnPropertySymbols(Foo);
    exportData(symbols);
`

it('returns symbols from other namespace', () => {
  const secureEvalOne = createSecureEnvironment(undefined, { exportData })
  secureEvalOne(oneScript)
  const Foo = exported
  const secureEvalTwo = createSecureEnvironment(
    undefined,
    { exportData, Foo }
  );
  secureEvalTwo(twoScript);
  const symbols = exported;
  expect(symbols.length).toBe(1);
})
