'use strict';

const path = require('path');

module.exports = {
    globals: {
      jasmine: true
    },
    ignorePatterns: ['.eslintrc.js'],
    overrides: [
        {
            files: ['**/*.{js,ts}'],
            rules: {
                'import/no-unresolved': [0]
            },
        },
    ],
};
