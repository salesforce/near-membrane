'use strict';

const replacePlugin = require('@rollup/plugin-replace');
const { terser } = require('rollup-plugin-terser');
const typescriptPlugin = require('@rollup/plugin-typescript');
const { getBabelOutputPlugin } = require('../plugins/babel-output.cjs');

function createConfig({
    input = 'src/index.ts',
    filePrefix = 'index',
    external = [],
    prod = false,
} = {}) {
    process.env.NODE_ENV = prod ? 'production' : 'development';

    const DEV_MODE = !prod;
    return {
        input,
        output: {
            file: `dist/${filePrefix}${prod ? '.min' : ''}.js`,
            format: 'es',
            sourcemap: true,
            // prettier-ignore
            plugins: [
                getBabelOutputPlugin(),
                prod ? terser() : undefined,
            ],
        },
        plugins: [
            typescriptPlugin(),
            replacePlugin({
                preventAssignment: true,
                DEV_MODE: JSON.stringify(DEV_MODE),
            }),
        ],
        external,
    };
}

module.exports = {
    rollupConfig(options = {}) {
        return [
            createConfig({ ...options, prod: false }),
            createConfig({ ...options, prod: true }),
        ];
    },
};
