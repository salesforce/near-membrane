'use strict';

const replacePlugin = require('@rollup/plugin-replace');
const { rollupConfig } = require('@locker/scripts/rollup/configs/base.cjs');

const DEV_MODE = process.env.NODE_ENV === 'development';

module.exports = rollupConfig({
    plugins: [
        DEV_MODE
            ? undefined
            : replacePlugin({
                  preventAssignment: true,
                  DEV_MODE: JSON.stringify(DEV_MODE),
              }),
    ],
});
