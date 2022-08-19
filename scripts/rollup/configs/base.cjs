'use strict';

const mergeOptions = require('merge-options');
const typescriptPlugin = require('@rollup/plugin-typescript');
const { getBabelOutputPlugin } = require('../plugins/babel-output.cjs');

const mergeOptionsConfig = {
    concatArrays: true,
    ignoreUndefined: true,
};

function createConfig({
    // prettier-ignore
    input = 'src/index.ts',
    format = 'cjs',
    ...rollupOverrides
} = {}) {
    const isCJS = format === 'cjs';

    return mergeOptions.call(
        mergeOptionsConfig,
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
    rollupConfig(providedOptions) {
        return [
            createConfig({ ...providedOptions, format: 'es' }),
            createConfig({ ...providedOptions, format: 'cjs' }),
        ];
    },
};
