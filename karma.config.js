const globby = require('globby');

process.env.CHROME_BIN = require('puppeteer').executablePath();

let testFilesGlob = process.argv[process.argv.length - 1]; // last argv
if (!testFilesGlob.includes('**/')) {
  testFilesGlob = `test/**/${testFilesGlob}`;
}
if (!testFilesGlob.endsWith('*.spec.js')) {
  testFilesGlob = testFilesGlob.endsWith('*') ? `${testFilesGlob}.spec.js` : `${testFilesGlob}*.spec.js`;
}
if (globby.sync(testFilesGlob).length === 0) {
  testFilesGlob = 'test/**/*.spec.js'; // test all files
}
console.log(`Testing files matching "${testFilesGlob}"`);

module.exports = function(config) {
  config.set({
    files: [{ pattern: testFilesGlob, watched: true, type: 'module' }],

    browsers: ['ChromeHeadless'],

    preprocessors: {
      'test/**/*.spec.js': ['rollup'],
    },

    // Use jasmine as test framework for the suite.
    frameworks: ['jasmine'],

    rollupPreprocessor: {
      /**
       * This is just a normal Rollup config object,
       * except that `input` is handled for you.
       */
      output: {
        format: 'es',
        sourcemap: 'inline',
      },
    },
  });
};
