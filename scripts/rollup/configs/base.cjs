'use strict';

const mergeOptions = require('merge-options');
const fs = require('fs-extra');
const typescriptPlugin = require('rollup-plugin-ts');
const { getBabelOutputPlugin } = require('../plugins/babel-output.cjs');

const mergeOptionsConfig = {
    concatArrays: true,
    ignoreUndefined: true,
};

function createConfig({
    // prettier-ignore
    input = 'src/index.ts',
    format = 'cjs',
    outputBasename = 'index',
    ...rollupOverrides
} = {}) {
    const isCJS = format === 'cjs';
    const packageJSONPath = 'package.json';

    const packageJSON = fs.readJSONSync(packageJSONPath);
    const { dependencies } = packageJSON;

    const mergedRollupOptions = mergeOptions.call(
        mergeOptionsConfig,
        {
            input,
            external: undefined,
            output: {
                exports: 'auto',
                file: `dist/${outputBasename}${isCJS ? '.cjs' : '.mjs'}.js`,
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

    if (!mergedRollupOptions.external && dependencies) {
        mergedRollupOptions.external = Object.keys(dependencies);
    }

    return mergedRollupOptions;
}

module.exports = {
    createConfig,
    rollupConfig(providedOptions) {
        return [
            createConfig({ ...providedOptions, format: 'es' }),
            createConfig({ ...providedOptions, format: 'cjs' }),
        ];
    },
};
