'use strict';

const replacePlugin = require('@rollup/plugin-replace');
const { terser } = require('rollup-plugin-terser');
const typescriptPlugin = require('@rollup/plugin-typescript');

function createConfig({
    input = 'src/index.ts',
    filePrefix = 'index',
    external = [],
    prod = false,
} = {}) {
    const DEV_MODE = !prod;
    return {
        input,
        output: {
            file: `lib/${filePrefix}${prod ? '.min' : ''}.js`,
            format: 'es',
            sourcemap: true,
            plugins: [prod ? terser() : undefined],
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
