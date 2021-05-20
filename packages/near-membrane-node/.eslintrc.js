'use strict';

const path = require('path');

module.exports = {
    ignorePatterns: ['.eslintrc.js'],
    overrides: [
        {
            files: ['**/*.{js,ts}'],
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
