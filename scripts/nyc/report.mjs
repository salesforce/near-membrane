import { execSync } from 'child_process';
// IMPORTANT!
// Unfortunately the fs-extra module does not name its exports in a native-compatible way.
// Attempting to:
//
//    import { copyFileSync, emptyDirSync } from 'fs-extra';
//
// Will result in the following:
//
//  SyntaxError: Named export 'copyFileSync' not found. The requested module 'fs-extra' is a
//  CommonJS module, which may not support all module.exports as named exports.
//  CommonJS modules can always be imported via the default export, for example using:
import fs from 'fs-extra';

const { copyFileSync, emptyDirSync } = fs;
const COVERAGE_REPORT_PATH = 'coverage/report';
const COVERAGE_DATA_PATH = 'coverage/data';
const NYC_OUTPUT_PATH = '.nyc_output';

// Create the gitignored directories that will be used for holding the raw coverage data and the
// coverage report files
emptyDirSync(COVERAGE_DATA_PATH);
emptyDirSync(COVERAGE_REPORT_PATH);
emptyDirSync(NYC_OUTPUT_PATH);

// The source files are created by jest and karma (see respective configs in root)
copyFileSync('jest-coverage/json/coverage-final.json', `${COVERAGE_DATA_PATH}/jest.json`);
copyFileSync('karma-coverage/json/coverage-final.json', `${COVERAGE_DATA_PATH}/karma.json`);

const options = { stdio: 'inherit' };

// Tell nyc to merge all .json files found in the raw coverage data directory and put the result
// in .nyc_output/coverage.json. Finally, generate a report using the default .nyc_output source
execSync(`nyc merge ${COVERAGE_DATA_PATH} .nyc_output/coverage.json`, options);
execSync(`nyc report --reporter html --report-dir ${COVERAGE_REPORT_PATH}`, options);
