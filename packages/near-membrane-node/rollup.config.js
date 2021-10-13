'use strict';

const { rollupConfig } = require('../../rollup.config.js');

module.exports = rollupConfig({
    external: ['@locker/near-membrane-base', 'vm'],
});
