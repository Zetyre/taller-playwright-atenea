// Turns Playwright's JSON report into a Markdown summary for $GITHUB_STEP_SUMMARY.
// Usage: node scripts/ci-summary.mjs results.json
import { readFileSync } from 'node:fs';

const report = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const { expected = 0, unexpected = 0, flaky = 0, skipped = 0, duration = 0 } = report.stats;

const failed = [];
const flakyTests = [];
const visit = (suite, titles = []) => {
  const path = suite.title ? [...titles, suite.title] : titles;
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests) {
      const name = `\`${test.projectName}\` ${[...path, spec.title].join(' › ')}`;
      if (test.status === 'unexpected') failed.push(name);
      if (test.status === 'flaky') flakyTests.push(name);
    }
  }
  for (const child of suite.suites ?? []) visit(child, path);
};
for (const suite of report.suites) visit(suite);

const lines = [
  `## Playwright results ${unexpected > 0 ? '❌' : '✅'}`,
  '',
  '| Passed | Failed | Flaky | Skipped | Duration |',
  '| --- | --- | --- | --- | --- |',
  `| ${expected} | ${unexpected} | ${flaky} | ${skipped} | ${(duration / 1000).toFixed(0)}s |`,
  '',
];
if (failed.length) lines.push('### Failed', ...failed.map(name => `- ${name}`), '');
if (flakyTests.length) lines.push('### Flaky (passed on retry)', ...flakyTests.map(name => `- ${name}`), '');
lines.push('Download the `playwright-report` artifact for traces, screenshots and videos.');

console.log(lines.join('\n'));
