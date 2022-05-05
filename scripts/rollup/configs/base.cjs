'use strict';

const mergeOptions = require('merge-options');
const typescriptPlugin = require('@rollup/plugin-typescript');
const { getBabelOutputPlugin } = require('../plugins/babel-output.cjs');

function createConfig({
    // prettier-ignore
    input = 'src/index.ts',
    format = 'cjs',
    ...rollupOverrides
} = {}) {
    const isCJS = format === 'cjs';

    return mergeOptions.call(
        { concatArrays: true },
        {
            input,
            external: [],
            output: {
                exports: 'auto',
                file: `dist/index${isCJS ? '.cjs' : ''}.js`,
                format,
                // prettier-ignore
                plugins: [
                    getBabelOutputPlugin(),
                ],
            },
            // prettier-ignore
            plugins: [
                typescriptPlugin(),
            ],
        },
        rollupOverrides
    );
}

module.exports = {
    rollupConfig(options = {}) {
        return [
            createConfig({ ...options, format: 'es' }),
            createConfig({ ...options, format: 'cjs' }),
        ];
    },
};
