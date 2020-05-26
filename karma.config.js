process.env.CHROME_BIN = require('puppeteer').executablePath();

module.exports = function(config) {
  config.set({
    files: [{ pattern: 'test/**/*.spec.js', watched: true, type: 'module' }],

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
