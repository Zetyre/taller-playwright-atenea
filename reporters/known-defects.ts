import { writeFileSync } from 'node:fs';
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { EXPECTED_FAILURE_ANNOTATION, ISSUE_ANNOTATION, KNOWN_BUG_TAG } from '../utils/knownBug';

/**
 * Reports `@known-bug` tests apart from real passes, and checks that each one fails for its declared reason.
 *
 * Playwright counts a `test.fail()` test that fails as passed, so "157 passed" hides how many known defects are
 * still open, and a known-bug test that breaks for an unrelated reason (a selector, a timeout) still looks fine.
 * This reporter:
 * - lists the defects still present, grouped by issue;
 * - fails the run when a known-bug test fails with an error that does not match its `expected-failure` pattern,
 *   or when the test is misconfigured (no `test.fail()`, no pattern);
 * - lists known-bug tests that now pass (Playwright already fails the run for those: remove `test.fail()`).
 *
 * Set KNOWN_DEFECTS_MARKDOWN to a file path to also write the list as Markdown (CI adds it to the job summary).
 */

type Outcome = 'present' | 'wrong-reason' | 'fixed' | 'misconfigured';

type Entry = {
  issue: string;
  title: string;
  project: string;
  outcome: Outcome;
  /** Why a test is misconfigured. */
  detail?: string;
  /** For a wrong-reason failure: the declared pattern, and what the test failed with instead. */
  expected?: string;
  got?: string;
};

// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE = /\u001b\[[0-9;]*m/g;
/** Source-code excerpt lines Playwright adds to errors, e.g. "> 12 |   await expect(...)". */
const CODE_FRAME_LINE = /^>?\s*\d+\s+\|/;

const stripAnsi = (text: string) => text.replace(ANSI_ESCAPE, '');

/** The first few meaningful lines of an error: enough to see what actually failed. */
const summarize = (text: string) =>
  text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && line !== 'Error:' && !line.startsWith('Call log') && !CODE_FRAME_LINE.test(line))
    .slice(0, 3)
    .join(' / ')
    .slice(0, 300);

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;

export default class KnownDefectsReporter implements Reporter {
  // Keyed by test id, so only the last attempt of a retried test counts.
  private readonly latest = new Map<string, { test: TestCase; result: TestResult }>();

  printsToStdio(): boolean {
    return true;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (test.tags.includes(KNOWN_BUG_TAG)) this.latest.set(test.id, { test, result });
  }

  // Returning a status overrides the run's result, which is how a wrong-reason failure fails the run.
  // eslint-disable-next-line @typescript-eslint/require-await
  async onEnd(): Promise<{ status?: FullResult['status'] } | undefined> {
    const entries = [...this.latest.values()].map(({ test, result }) => classify(test, result)).filter(isEntry);
    if (entries.length === 0) return undefined;

    const by = (outcome: Outcome) => entries.filter(entry => entry.outcome === outcome);
    const present = by('present');
    const problems = [...by('wrong-reason'), ...by('misconfigured')];
    const fixed = by('fixed');

    console.log(renderText(present, problems, fixed));
    const markdownFile = process.env.KNOWN_DEFECTS_MARKDOWN;
    if (markdownFile) writeFileSync(markdownFile, renderMarkdown(present, problems, fixed));
    return problems.length > 0 ? { status: 'failed' } : undefined;
  }
}

function isEntry(entry: Entry | undefined): entry is Entry {
  return entry !== undefined;
}

function classify(test: TestCase, result: TestResult): Entry | undefined {
  if (result.status === 'skipped' || result.status === 'interrupted') return undefined;
  const annotation = (type: string) => test.annotations.find(a => a.type === type)?.description;
  const issue = /^([\w.-]+\/[\w.-]+#\d+)\./.exec(annotation(ISSUE_ANNOTATION) ?? '')?.[1] ?? '(no issue)';
  const base = { issue, title: test.title, project: test.parent.project()?.name ?? '' };

  if (test.expectedStatus !== 'failed') {
    // A setup error before test.fail() ran is already reported by Playwright as a failure.
    if (result.status !== 'passed') return undefined;
    return { ...base, outcome: 'misconfigured', detail: `tagged ${KNOWN_BUG_TAG} but test.fail() is not called` };
  }
  if (result.status === 'passed') return { ...base, outcome: 'fixed' };

  const pattern = annotation(EXPECTED_FAILURE_ANNOTATION);
  if (!pattern) {
    return { ...base, outcome: 'misconfigured', detail: `no "${EXPECTED_FAILURE_ANNOTATION}" annotation` };
  }
  const expected = new RegExp(pattern);
  const messages = result.errors.map(error => stripAnsi(error.message ?? error.value ?? ''));
  const unexpected = messages.find(message => !expected.test(message));
  if (messages.length > 0 && unexpected === undefined) return { ...base, outcome: 'present' };
  const got = result.status === 'timedOut' ? 'the test timed out' : summarize(unexpected ?? 'no error message');
  return { ...base, outcome: 'wrong-reason', expected: `/${pattern}/`, got };
}

/** Groups entries by issue, then by title, collecting the projects (browsers) each one ran in. */
function group(entries: Entry[]): Map<string, Map<string, string[]>> {
  const issues = new Map<string, Map<string, string[]>>();
  const sorted = [...entries].sort(
    (a, b) => a.issue.localeCompare(b.issue, 'en', { numeric: true }) || a.title.localeCompare(b.title, 'en'),
  );
  for (const entry of sorted) {
    const titles = issues.get(entry.issue) ?? new Map<string, string[]>();
    titles.set(entry.title, [...(titles.get(entry.title) ?? []), entry.project].sort());
    issues.set(entry.issue, titles);
  }
  return issues;
}

function describeProblem(entry: Entry, code: (text: string) => string): string {
  return entry.expected ? `expected ${code(entry.expected)}, got: ${code(entry.got ?? '')}` : (entry.detail ?? '');
}

function renderText(present: Entry[], problems: Entry[], fixed: Entry[]): string {
  const issues = group(present);
  const lines = ['', `Known defects still present: ${count(issues.size, 'issue')}, ${count(present.length, 'check')}`];
  for (const [issue, titles] of issues) {
    lines.push(`  ${issue}`);
    for (const [title, projects] of titles) lines.push(`    ${title} [${projects.join(', ')}]`);
  }
  if (fixed.length > 0) {
    lines.push('', `Known-bug tests that now pass (remove test.fail() and the ${KNOWN_BUG_TAG} tag): ${fixed.length}`);
    for (const entry of fixed) lines.push(`  ✘ [${entry.project}] ${entry.title} (${entry.issue})`);
  }
  if (problems.length > 0) {
    lines.push('', `Known-bug tests that did not fail for their declared reason: ${problems.length}`);
    for (const entry of problems) {
      lines.push(`  ✘ [${entry.project}] ${entry.title}`, `      ${describeProblem(entry, text => text)}`);
    }
  }
  return lines.join('\n');
}

function issueLink(issue: string): string {
  const match = /^(.+)#(\d+)$/.exec(issue);
  return match ? `[${issue}](https://github.com/${match[1]}/issues/${match[2]})` : issue;
}

/** Inline code for Markdown; backticks inside would end the span early. */
const inlineCode = (text: string) => `\`${text.replace(/`/g, "'")}\``;

function renderMarkdown(present: Entry[], problems: Entry[], fixed: Entry[]): string {
  const issues = group(present);
  const lines = [
    `## Known defects ${problems.length > 0 ? '❌' : '🐞'}`,
    '',
    `${count(issues.size, 'reported defect')} still present in the app (${count(present.length, 'check')}). ` +
      'Their tests are marked `test.fail()`, so they count as passed while each fails for its declared reason.',
    '',
    '| Issue | Check | Browsers |',
    '| --- | --- | --- |',
  ];
  for (const [issue, titles] of issues) {
    for (const [title, projects] of titles) lines.push(`| ${issueLink(issue)} | ${title} | ${projects.join(', ')} |`);
  }
  if (fixed.length > 0) {
    lines.push('', '### Now passing: remove `test.fail()`', '');
    for (const entry of fixed) lines.push(`- \`${entry.project}\` ${entry.title} (${issueLink(entry.issue)})`);
  }
  if (problems.length > 0) {
    lines.push('', '### Failed for a different reason than declared', '');
    for (const entry of problems) {
      lines.push(`- \`${entry.project}\` ${entry.title}: ${describeProblem(entry, inlineCode)}`);
    }
  }
  return `${lines.join('\n')}\n\n`;
}
