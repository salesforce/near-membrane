/* eslint-disable import/no-extraneous-dependencies */

'use strict';

const path = require('node:path');
const globby = require('globby');
const istanbul = require('rollup-plugin-istanbul');
const { nodeResolve } = require('@rollup/plugin-node-resolve');

let testFilesPattern = './test/**/*.spec.js';

const basePath = path.resolve(__dirname, './');
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

const customLaunchers = {
    ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--disable-gpu', '--no-sandbox'],
    },
};

module.exports = function (config) {
    const bootstrapFilesPattern = 'test/__bootstrap__/**/*.js';
    const fileFixturesPattern = '**/untrusted/**/*.js';
    const karmaConfig = {
        basePath,
        browsers: Object.keys(customLaunchers),
        browserConsoleLogOptions: { level: config.LOG_ERROR, format: '%m', terminal: true },
        browserDisconnectTimeout: 10000,
        browserDisconnectTolerance: 3,
        browserNoActivityTimeout: 100000,
        client: {
            captureConsole: false,
        },
        concurrency: 1,
        customLaunchers,
        files: [
            bootstrapFilesPattern,
            { pattern: testFilesPattern, watched: true, type: 'module' },
        ],
        frameworks: ['jasmine'],
        logLevel: config.LOG_ERROR,
        preprocessors: {
            [bootstrapFilesPattern]: ['rollup'],
            [fileFixturesPattern]: ['file-fixtures'],
            [testFilesPattern]: ['rollup'],
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
                nodeResolve({
                    preferBuiltins: true,
                }),
            ],
        },
    };

    if (coverage) {
        karmaConfig.reporters.push('coverage');
        karmaConfig.rollupPreprocessor.plugins.push(
            istanbul({
                exclude: ['packages/near-membrane-node', 'test/**/*.spec.js'],
            })
        );
        karmaConfig.coverageReporter = {
            dir: 'karma-coverage/',
            reporters: [{ type: 'json', subdir: 'json', file: 'coverage-final.json' }],
        };
    }

    config.set(karmaConfig);
};
