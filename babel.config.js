'use strict';

const DEV_MODE = process.env.NODE_ENV === 'development';

module.exports = {
    compact: false,
    plugins: ['@babel/plugin-syntax-dynamic-import'],
    presets: [
        '@babel/preset-typescript',
        [
            '@babel/preset-env',
            {
                bugfixes: true,
                debug: DEV_MODE,
                exclude: [
                    '@babel/plugin-proposal-class-properties',
                    '@babel/plugin-proposal-dynamic-import',
                    '@babel/plugin-proposal-private-methods',
                    '@babel/plugin-transform-regenerator',
                ],
                loose: true,
                targets: {
                    // Visual representation of the Browserslist query at
                    // https://browserslist.dev/?q=Y2hyb21lIDY5LCBlZGdlIDE1LCBsYXN0IDIgZmlyZWZveCB2ZXJzaW9ucywgbm9kZSAxNCwgc2FmYXJpIDEz
                    browsers: [
                        // Support Android emulators running Chrome 69.
                        'chrome 69',
                        'edge 15',
                        'last 2 firefox versions',
                        'node 14',
                        'safari 13',
                    ],
                },
            },
        ],
    ],
};
