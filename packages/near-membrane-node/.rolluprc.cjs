'use strict';

const { rollupConfig } = require('@locker/scripts/rollup/configs/base.cjs');

module.exports = rollupConfig({
    external: ['@locker/near-membrane-base', 'vm'],
});
