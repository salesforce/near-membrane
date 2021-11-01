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
                        // Support Android emulator with user agent:
                        // Mozilla/5.0 (Linux; Android 9; Android SDK built for x86_64 Build/PSR1.180720.122; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/69.0.3497.100 Mobile Safari/537.36
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
