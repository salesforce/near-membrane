'use strict';

module.exports = {
    collectCoverage: true,
    coverageDirectory: 'jest-coverage/json/',
    coveragePathIgnorePatterns: [
        '/node_modules/',
        'packages/near-membrane-base/src/',
        'packages/near-membrane-shared/src/',
        'packages/near-membrane-shared-dom/src/',
    ],
    coverageReporters: ['json'],
    moduleNameMapper: {
        '^@locker/(near-membrane-\\w+)$': '<rootDir>/packages/$1/src',
    },
    roots: [
        '<rootDir>/packages/near-membrane-base',
        '<rootDir>/packages/near-membrane-node',
        '<rootDir>/packages/near-membrane-shared',
        '<rootDir>/packages/near-membrane-shared-dom',
    ],
    testEnvironment: 'jsdom',
    testEnvironmentOptions: {
        url: 'http://localhost/',
    },
    verbose: true,
};
