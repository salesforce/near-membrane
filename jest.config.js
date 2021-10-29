'use strict';

module.exports = {
    moduleNameMapper: {
        '^@locker/near-membrane-base$': '<rootDir>/packages/near-membrane-base/src',
        '^@locker/near-membrane-node$': '<rootDir>/packages/near-membrane-node/src',
    },
    roots: ['<rootDir>/packages/near-membrane-base', '<rootDir>/packages/near-membrane-node'],
    testEnvironment: 'jsdom',
    testURL: 'http://localhost/',
    verbose: true,
};
