'use strict';

const fs = require('fs-extra');
const path = require('path');
const replacePlugin = require('@rollup/plugin-replace');
const { createConfig, rollupConfig } = require('@locker/scripts/rollup/configs/base.cjs');

const customDevtoolsFormatterBasename = 'custom-devtools-formatter';
const customDevtoolsFormatterFileName = `${customDevtoolsFormatterBasename}.ts`;
const customDevtoolsFormatterPath = path.resolve(`src/${customDevtoolsFormatterFileName}`);
const packageJSONPath = 'package.json';

const packageJSON = fs.readJSONSync(packageJSONPath);
const { dependencies } = packageJSON;

const external = [
    customDevtoolsFormatterPath,
    ...Object.keys(dependencies)
];

module.exports = [
    createConfig({
        external,
        format: 'es',
        plugins: [
            replacePlugin({
                preventAssignment: true,
                [customDevtoolsFormatterFileName]: `${customDevtoolsFormatterBasename}.mjs.js`,
            }),
        ],
    }),
    createConfig({
        external,
        format: 'cjs',
        plugins: [
            replacePlugin({
                preventAssignment: true,
                [customDevtoolsFormatterFileName]: `${customDevtoolsFormatterBasename}.cjs.js`,
            }),
        ],
    }),
    ...rollupConfig({
        outputBasename: customDevtoolsFormatterBasename,
        input: customDevtoolsFormatterPath
    }),
];
