import * as cp from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import fetch from 'node-fetch';
import util from 'node:util';

const exec = util.promisify(cp.exec);

function exit({ code = 0, message }) {
    const kind = code ? 'error' : 'log';
    // eslint-disable-next-line no-console
    console[kind](message);
    process.exit(code);
}

const {
    NEW_COVERAGE_PATH,
    GITHUB_PR_NUMBER,
    GITHUB_REF_NAME,
    GITHUB_REPOSITORY_OWNER,
    GITHUB_REPOSITORY,
    GITHUB_STEP_SUMMARY,
    GITHUB_TOKEN,
} = process.env;

if (!GITHUB_REF_NAME || !GITHUB_REPOSITORY || !GITHUB_REPOSITORY_OWNER) {
    exit({ code: 1, message: 'Missing CI environment variables' });
}

if (!GITHUB_TOKEN) {
    exit({ code: 1, message: 'Missing Github credentials' });
}

const GH_PROJECT_ENDPOINT = `https://api.github.com/repos/${GITHUB_REPOSITORY}`;
const GH_PROJECT_PAGES_ENDPOINT = `https://api.github.com/repos/${GITHUB_REPOSITORY}/pages`;

const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
};
const redirect = 'follow';

(async () => {
    let coverageReportURL = '';
    try {
        const response = await fetch(GH_PROJECT_PAGES_ENDPOINT, {
            headers,
            redirect,
        });
        const data = await response.json();
        coverageReportURL = `${data?.html_url}${NEW_COVERAGE_PATH}`;
    } catch (error) {
        exit(error);
    }

    await writeFile(GITHUB_STEP_SUMMARY, coverageReportURL);

    let prCommentsURL = GITHUB_PR_NUMBER
        ? `${GH_PROJECT_ENDPOINT}/issues/${GITHUB_PR_NUMBER}/comments`
        : undefined;

    if (!prCommentsURL) {
        try {
            const response = await fetch(
                `${GH_PROJECT_ENDPOINT}/pulls?head=${GITHUB_REPOSITORY_OWNER}:${GITHUB_REF_NAME}&state=open`,
                {
                    headers,
                    redirect,
                }
            );
            const data = await response.json();
            prCommentsURL = data?.[0]?.comments_url;
        } catch (error) {
            exit(error);
        }
    }

    // There is no valid PR to post back to, so exit
    if (!prCommentsURL) {
        exit({ message: 'No PR to post coverage report to' });
    }

    const { stdout: summary } = await exec(
        'npx nyc report --report-dir=.nyc_output --reporter=text-summary',
        {
            stdio: 'inherit',
        }
    );

    let sum = 0;
    const rows = summary
        .trim()
        .split('\n')
        .slice(1, -1)
        .map((row) => {
            const matches = row.match(/^(\w+)\s+:\s([\d.]+%)\s(.+)$/);
            if (matches && matches.length >= 4) {
                const { 1: metric, 2: percent, 3: coveredTotal } = matches;
                const parsed = parseFloat(percent, 10);
                sum += parsed;
                return `| ${metric} | ${percent} | ${coveredTotal} |`;
            }
            return row;
        });

    const combined = Math.round((sum / 4) * 100) / 100;

    const messageBody = `
  | Metric | Coverage Percent | Covered / Total |
  | ------ | ---------------- | --------------- |
  ${rows.join('\n')}
  ||
  | **Total**  | **${combined}%** | |

  [See detailed coverage](${coverageReportURL})
  `;

    const body = JSON.stringify({ body: messageBody });

    try {
        const response = await fetch(prCommentsURL, {
            body,
            headers,
            method: 'POST',
            redirect,
        });
        if (!response.ok) {
            const text = await response.text();
            exit({ code: 1, message: `Github responded with "${text}"` });
        }
        exit({ message: `Coverage report posted to ${prCommentsURL}` });
    } catch (error) {
        exit(error);
    }
})();
