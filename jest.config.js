'use strict';

module.exports = {
    collectCoverage: true,
    coverageDirectory: 'jest-coverage/json/',
    coverageReporters: ['json'],
    moduleNameMapper: {
        '^@locker/near-membrane-base$': '<rootDir>/packages/near-membrane-base/src',
        '^@locker/near-membrane-node$': '<rootDir>/packages/near-membrane-node/src',
    },
    roots: ['<rootDir>/packages/near-membrane-base', '<rootDir>/packages/near-membrane-node'],
    testEnvironment: 'jsdom',
    testEnvironmentOptions: {
        url: 'http://localhost/',
    },
    verbose: true,
};
