/* eslint-disable import/no-extraneous-dependencies */

'use strict';

const globby = require('globby');
const istanbul = require('rollup-plugin-istanbul');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const replaceRollupPlugin = require('@rollup/plugin-replace');
const path = require('node:path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

process.env.CHROME_BIN = require('puppeteer').executablePath();

let testFilesPattern = './test/**/*.spec.js';

const basePath = path.resolve(__dirname, './');
const argv = yargs(hideBin(process.argv))
    .options({
        coverage: { type: 'boolean' },
        match: { type: 'string' },
        'use-shadow-realm': { type: 'boolean' },
    })
    .hide('help')
    .hide('version').argv;
const { coverage, match, useShadowRealm } = argv;

if (match) {
    testFilesPattern = match;
}

if (globby.sync(testFilesPattern).length) {
    // eslint-disable-next-line no-console
    console.log(`\nTesting files matching "${testFilesPattern}"\n`);
} else {
    // eslint-disable-next-line no-console
    console.error(`\nNo test files matching "${testFilesPattern}"\n`);
    process.exit(0);
}

const customLaunchers = {
    ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--disable-gpu', '--no-sandbox'],
    },
};

module.exports = function (config) {
    const bootstrapFilesPattern = 'test/__bootstrap__/**/*.js';
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
                replaceRollupPlugin({
                    include: ['./test/__bootstrap__/create-virtual-environment.js'],
                    preventAssignment: true,
                    values: {
                        'process.env.USE_SHADOW_REALM': JSON.stringify(useShadowRealm),
                    },
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
