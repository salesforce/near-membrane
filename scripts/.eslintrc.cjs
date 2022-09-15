'use strict';

const path = require('node:path');

module.exports = {
    env: {
        node: true,
    },
    rules: {
        'import/no-extraneous-dependencies': [
            'error',
            // Use package.json from root
            { packageDir: [path.join(__dirname, '..')] },
        ],
    },
};
