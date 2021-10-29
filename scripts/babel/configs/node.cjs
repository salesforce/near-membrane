'use strict';

const { BABEL_PRESET_ENV_MODULES } = process.env;

let modules = 'auto';
if (BABEL_PRESET_ENV_MODULES === false || BABEL_PRESET_ENV_MODULES === 'false') {
    modules = false;
} else if (BABEL_PRESET_ENV_MODULES) {
    modules = BABEL_PRESET_ENV_MODULES;
}
const plugins = ['@babel/plugin-syntax-dynamic-import'];
if (modules === 'cjs') {
    plugins.push([
        '@babel/plugin-transform-modules-commonjs',
        {
            importInterop: 'node',
            strict: true,
        },
    ]);
}
module.exports = {
    compact: false,
    plugins,
    presets: [
        '@babel/preset-typescript',
        [
            '@babel/preset-env',
            {
                exclude: [
                    '@babel/plugin-proposal-dynamic-import',
                    '@babel/plugin-transform-regenerator',
                ],
                modules,
                targets: {
                    browsers: ['node 14'],
                },
            },
        ],
    ],
};
