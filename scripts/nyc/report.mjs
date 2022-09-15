import { execSync } from 'node:child_process';
import fs from 'fs-extra';

const { copyFileSync, emptyDirSync } = fs;
const COVERAGE_REPORT_PATH = 'coverage/report';
const COVERAGE_DATA_PATH = 'coverage/data';
const NYC_OUTPUT_PATH = '.nyc_output';

// Create the gitignored directories that will be used for holding the raw
// coverage data and the coverage report files.
emptyDirSync(COVERAGE_DATA_PATH);
emptyDirSync(COVERAGE_REPORT_PATH);
emptyDirSync(NYC_OUTPUT_PATH);

// The source files are created by jest and karma (see respective configs in root)
copyFileSync('jest-coverage/json/coverage-final.json', `${COVERAGE_DATA_PATH}/jest.json`);
copyFileSync('karma-coverage/json/coverage-final.json', `${COVERAGE_DATA_PATH}/karma.json`);

const options = { stdio: 'inherit' };

// Tell nyc to merge all .json files found in the raw coverage data directory
// and put the result in .nyc_output/coverage.json. Finally, generate a report
// using the default .nyc_output source.
execSync(`nyc merge ${COVERAGE_DATA_PATH} .nyc_output/coverage.json`, options);
execSync(`nyc report --reporter html --report-dir ${COVERAGE_REPORT_PATH}`, options);
