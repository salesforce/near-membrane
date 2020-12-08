const { nodeResolve } = require('@rollup/plugin-node-resolve');

process.env.CHROME_BIN = require('puppeteer').executablePath();

let testFiles = '';
const matchArg = process.argv.indexOf('--match');
if (matchArg > -1) {
  testFiles = process.argv[matchArg + 1] || '';
}
if (!testFiles) {
  testFiles = 'test/**/*.spec.js';
}
console.log(`Testing files matching "${testFiles}"`);

module.exports = function(config) {
  config.set({
    files: [{ pattern: testFiles, watched: true, type: 'module' }],

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
      plugins: [
        nodeResolve(),
      ],
    },
  });
};
