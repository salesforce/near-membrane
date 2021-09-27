module.exports = {
    roots: ['<rootDir>/packages/near-membrane-base', '<rootDir>/packages/near-membrane-node'],
    moduleNameMapper: {
        '^@locker/near-membrane-base$': '<rootDir>/packages/near-membrane-base/src',
        '^@locker/near-membrane-node$': '<rootDir>/packages/near-membrane-node/src',
    },
};
