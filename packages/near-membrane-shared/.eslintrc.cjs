'use strict';

const path = require('node:path');

module.exports = {
    globals: {
        BigInt: 'readonly',
        BigInt64Array: 'readonly',
        BigUint64Array: 'readonly',
        SharedArrayBuffer: 'readonly',
    },
    overrides: [
        {
            files: ['**/*.*'],
            rules: {
                'import/no-extraneous-dependencies': [
                    'error',
                    // Use package.json from both this package folder and root.
                    { packageDir: [__dirname, path.join(__dirname, '../..')] },
                ],
            },
        },
    ],
};
