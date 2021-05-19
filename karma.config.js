const globby = require('globby');
const istanbul = require('rollup-plugin-istanbul');
const { nodeResolve } = require('@rollup/plugin-node-resolve');

process.env.CHROME_BIN = require('puppeteer').executablePath();

let testFilesPattern = './test/**/*.spec.js';

const matchArg = process.argv.indexOf('--match');
if (matchArg > -1) {
  testFilesPattern = process.argv[matchArg + 1] || '';
}

if (globby.sync(testFilesPattern).length) {
  // eslint-disable-next-line no-console
  console.log(`\nTesting files matching "${testFilesPattern}"\n`);
} else {
  // eslint-disable-next-line no-console
  console.error(`\nNo test files matching "${testFilesPattern}"\n`);
  process.exit(0);
}

const coverage = process.argv.includes('--coverage');

module.exports = function(config) {

  const bootstrapFilesPattern = 'test/__bootstrap__/**/*.js';
  const karmaConfig = {
    browsers: ['ChromeHeadless'],
    files: [
      bootstrapFilesPattern,
      { pattern: testFilesPattern, watched: true, type: 'module' },
    ],
    frameworks: ['jasmine'],
    logLevel: config.LOG_INFO,
    preprocessors: {
      [bootstrapFilesPattern]: ['rollup'],
      'test/**/*.spec.js': ['rollup'],
    },
    reporters: ['progress'],
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
  };

  if (coverage) {
    karmaConfig.reporters.push('coverage');
    karmaConfig.rollupPreprocessor.plugins.push(
      istanbul({
        exclude: [
          'packages/near-membrane-node',
          'test/**/*.js',
        ],
      })
    );
    karmaConfig.coverageReporter = {
      dir: 'coverage/',
      reporters: [
        { type: 'html', subdir: 'html' },
        { type: 'json', subdir: 'json', file: 'coverage.json' },
        { type: 'text-summary' },
      ],
    };
  }

  config.set(karmaConfig);
};
