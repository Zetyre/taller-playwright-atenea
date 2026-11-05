// Builds the landing page of the GitHub Pages report archive and prunes old reports.
// Usage: node scripts/build-report-index.mjs <pages-dir> [--keep 30] [--repo https://github.com/owner/name]
//
// Each report-<run> folder may contain:
//   run-info.json   { run, status, event, date, runUrl, sha }   written by the publish job
//   run-stats.json  Playwright JSON reporter stats              written by the report job
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [pagesDir, ...flags] = process.argv.slice(2);
if (!pagesDir) {
  console.error('Usage: node scripts/build-report-index.mjs <pages-dir> [--keep N] [--repo URL]');
  process.exit(1);
}
const flag = (name, fallback) => {
  const index = flags.indexOf(`--${name}`);
  return index === -1 ? fallback : flags[index + 1];
};
const keep = Number(flag('keep', '30'));
const repoUrl = flag('repo', 'https://github.com/Zetyre/athena-bank-playwright-tests');

const readJson = path => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : undefined);
const escapeHtml = value =>
  String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const folders = readdirSync(pagesDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && /^report-\d+$/.test(entry.name))
  .map(entry => entry.name)
  .sort((a, b) => Number(b.slice(7)) - Number(a.slice(7)));

for (const old of folders.slice(keep)) rmSync(join(pagesDir, old), { recursive: true, force: true });

const runs = folders.slice(0, keep).map(folder => {
  const info = readJson(join(pagesDir, folder, 'run-info.json')) ?? {};
  const stats = readJson(join(pagesDir, folder, 'run-stats.json'));
  return { folder, run: info.run ?? Number(folder.slice(7)), ...info, stats };
});

const EVENT_LABELS = { push: 'Push to main', schedule: 'Nightly', workflow_dispatch: 'Manual' };
const formatDate = iso => (iso ? new Date(iso).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : '');
const formatDuration = ms => (ms ? `${Math.round(ms / 1000)}s` : '');

const statusPill = status =>
  status
    ? `<span class="pill ${status === 'passed' ? 'ok' : 'bad'}">${escapeHtml(status)}</span>`
    : '<span class="pill">unknown</span>';

const counts = stats =>
  stats
    ? `<span class="count ok">${stats.expected ?? 0} passed</span>` +
      (stats.unexpected ? `<span class="count bad">${stats.unexpected} failed</span>` : '') +
      (stats.flaky ? `<span class="count warn">${stats.flaky} flaky</span>` : '') +
      (stats.skipped ? `<span class="count">${stats.skipped} skipped</span>` : '')
    : '';

const rows = runs
  .map(
    run => `
      <tr>
        <td data-label="Run"><span class="v"><a href="./${run.folder}/">#${run.run}</a></span></td>
        <td data-label="Result"><span class="v">${statusPill(run.status)}</span></td>
        <td data-label="Tests" class="counts"><span class="v">${counts(run.stats)}</span></td>
        <td data-label="Duration"><span class="v">${formatDuration(run.stats?.duration)}</span></td>
        <td data-label="Trigger"><span class="v">${escapeHtml(EVENT_LABELS[run.event] ?? run.event ?? '')}</span></td>
        <td data-label="Date"><span class="v">${formatDate(run.date)}</span></td>
        <td data-label="Links" class="links"><span class="v">
          <a href="./${run.folder}/">Report</a>${run.runUrl ? ` <a href="${escapeHtml(run.runUrl)}">CI run</a>` : ''}
          ${run.sha ? ` <a href="${escapeHtml(`${repoUrl}/commit/${run.sha}`)}"><code>${escapeHtml(run.sha.slice(0, 7))}</code></a>` : ''}
        </span></td>
      </tr>`,
  )
  .join('');

const latest = runs[0];
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Athena Bank test reports</title>
<meta name="description" content="Playwright test reports for the Athena Bank E2E and API suite.">
<style>
  :root { --bg: #f6f8fa; --card: #ffffff; --text: #1f2328; --muted: #59636e; --border: #d1d9e0;
          --ok: #1a7f37; --ok-bg: #dafbe1; --bad: #cf222e; --bad-bg: #ffebe9; --warn: #9a6700; --warn-bg: #fff8c5; --link: #0969da; }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #0d1117; --card: #151b23; --text: #f0f6fc; --muted: #9198a1; --border: #3d444d;
            --ok: #3fb950; --ok-bg: #12261e; --bad: #f85149; --bad-bg: #2d1214; --warn: #d29922; --warn-bg: #272115; --link: #4493f8; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text);
         font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
  main { max-width: 1040px; margin: 0 auto; padding: 32px 16px 48px; }
  header { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; justify-content: space-between; margin-bottom: 24px; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  p { margin: 0; color: var(--muted); }
  a { color: var(--link); text-decoration: none; }
  a:hover { text-decoration: underline; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
  .latest { padding: 16px 20px; margin-bottom: 16px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap; }
  th { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
  tr:last-child td { border-bottom: 0; }
  .pill, .count { display: inline-block; padding: 1px 10px; border-radius: 999px; font-size: 13px; font-weight: 600;
                  border: 1px solid var(--border); margin-right: 4px; }
  .ok { color: var(--ok); background: var(--ok-bg); border-color: transparent; }
  .bad { color: var(--bad); background: var(--bad-bg); border-color: transparent; }
  .warn { color: var(--warn); background: var(--warn-bg); border-color: transparent; }
  .count { font-weight: 500; }
  .links a { margin-right: 10px; }
  code { font: 12px ui-monospace, SFMono-Regular, Menlo, monospace; }
  footer { margin-top: 16px; font-size: 13px; color: var(--muted); }
  @media (max-width: 720px) {
    thead { display: none; }
    tr { display: block; padding: 10px 14px; border-bottom: 1px solid var(--border); }
    td { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; border: 0; white-space: normal; }
    td::before { content: attr(data-label); color: var(--muted); font-size: 13px; flex: none; }
    td .v { text-align: right; }
  }
</style>
</head>
<body>
<main>
  <header>
    <div>
      <h1>Athena Bank test reports</h1>
      <p>Playwright E2E and API suite across Chromium, Firefox and WebKit. The last ${keep} runs on <code>main</code>.</p>
    </div>
    <p><a href="${escapeHtml(repoUrl)}">Repository</a> · <a href="${escapeHtml(`${repoUrl}/actions`)}">CI runs</a></p>
  </header>
  ${
    latest
      ? `<section class="card latest" aria-label="Latest run">
    <strong>Latest run #${latest.run}</strong> ${statusPill(latest.status)} ${counts(latest.stats)}
    <span style="color: var(--muted)">${formatDate(latest.date)}</span>
    <a href="./${latest.folder}/">Open report →</a>
  </section>`
      : ''
  }
  <section class="card" aria-label="All runs">
    <table>
      <thead><tr><th>Run</th><th>Result</th><th>Tests</th><th>Duration</th><th>Trigger</th><th>Date</th><th>Links</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="7">No reports published yet.</td></tr>'}
      </tbody>
    </table>
  </section>
  <footer>Public reports omit traces, screenshots and videos. Full reports are kept for 7 days as workflow artifacts.</footer>
</main>
</body>
</html>
`;

writeFileSync(join(pagesDir, 'index.html'), html);
console.log(`Wrote index with ${runs.length} report(s); pruned ${Math.max(folders.length - keep, 0)}.`);
