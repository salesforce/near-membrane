'use strict';

const DEV_MODE = process.env.NODE_ENV === 'development';

module.exports = {
    compact: false,
    plugins: [
        '@babel/plugin-syntax-dynamic-import',
        [
            '@babel/plugin-transform-modules-commonjs',
            {
                importInterop: 'node',
                strict: true,
            },
        ],
    ],
    presets: [
        '@babel/preset-typescript',
        [
            '@babel/preset-env',
            {
                bugfixes: true,
                debug: DEV_MODE,
                loose: true,
                targets: {
                    browsers: ['node 14'],
                },
            },
        ],
    ],
};
