module.exports = {
    "roots": [
      "<rootDir>/packages"
    ],
    "moduleNameMapper": {
      "^@locker/near-membrane$": "<rootDir>/packages/near-membrane/src",
      "^@locker/node-membrane$": "<rootDir>/packages/node-membrane/src",
    },
    "transform": {
      "^.+\\.tsx?$": "ts-jest"
    },
    globals: {
      'ts-jest': {
        diagnostics: false
      }
    }
}
