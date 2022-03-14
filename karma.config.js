/* eslint-disable import/no-extraneous-dependencies */

'use strict';

const globby = require('globby');
const istanbul = require('rollup-plugin-istanbul');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const path = require('path');

process.env.CHROME_BIN = require('puppeteer').executablePath();

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
    sl_chrome: {
        base: 'SauceLabs',
        browserName: 'chrome',
        flags: ['--disable-gpu', '--no-sandbox'],
        version: 'latest',
    },
    sl_firefox: {
        base: 'SauceLabs',
        browserName: 'firefox',
        version: 'latest',
    },
    sl_edge: {
        base: 'SauceLabs',
        browserName: 'MicrosoftEdge',
        version: 'latest',
        platform: 'Windows 10',
    },
    sl_safari_previous: {
        base: 'SauceLabs',
        browserName: 'safari',
        version: '13',
        platform: 'macOS 10.15',
    },
    sl_safari: {
        base: 'SauceLabs',
        browserName: 'safari',
        version: '14',
        platform: 'macOS 11',
    },
    sl_ios_previous: {
        base: 'SauceLabs',
        browserName: 'Safari',
        deviceName: 'iPhone 12 Pro Simulator',
        platformVersion: '14.5',
        platformName: 'iOS',
        appiumVersion: '1.21.0',
    },
    sl_ios: {
        base: 'SauceLabs',
        browserName: 'Safari',
        deviceName: 'iPhone 13 Simulator',
        platformVersion: '15.0',
        platformName: 'iOS',
        appiumVersion: '1.22.0',
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
            ],
        },
        sauceLabs: {
            idleTimeout: 1000,
            username: process.env.SauceLabs_Username,
            accessKey: process.env.SauceLabs_AccessKey,
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
