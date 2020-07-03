const glob = require('glob');

process.env.CHROME_BIN = require('puppeteer').executablePath();

let testFilesGlob = 'test/**/*.spec.js';
const globIndex = process.argv.indexOf('--glob');
if (globIndex > -1) {
  testFilesGlob = process.argv[globIndex + 1] || '';
  if (!testFilesGlob.includes('**/')) {
    testFilesGlob = `test/**/${testFilesGlob}`;
  }
  if (!testFilesGlob.endsWith('*.spec.js')) {
    testFilesGlob = `${testFilesGlob}*.spec.js`;
  }
  if (glob.sync(testFilesGlob).length === 0) {
    console.log(`No files matching "${testFilesGlob}"`);
    process.exit();
  }
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
