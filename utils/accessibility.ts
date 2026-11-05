import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

export type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>;
type Violation = AxeResults['violations'][number];

/** Rules for WCAG 2.2 level A and AA, the level most accessibility laws and company policies require. */
export const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export type ScanOptions = {
  /** CSS selectors to leave out of the scan, e.g. an element whose defect is tracked by its own test. */
  exclude?: string[];
  /** Limit the scan to these CSS selectors instead of the whole page. */
  include?: string[];
  /** Run only these axe rule ids. */
  rules?: string[];
};

/**
 * Scans the current page with axe-core and attaches the full results to the test report.
 *
 * Waits for finite animations to finish first: MUI dialogs fade in, and a scan taken mid-fade reports
 * colour-contrast failures for text that is still partly transparent.
 */
export async function scanAccessibility(page: Page, options: ScanOptions = {}): Promise<AxeResults> {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(animation => animation.playState !== 'running' || animation.effect?.getTiming().iterations === Infinity),
  );

  let builder = new AxeBuilder({ page }).withTags(WCAG_AA_TAGS);
  for (const selector of options.include ?? []) builder = builder.include(selector);
  for (const selector of options.exclude ?? []) builder = builder.exclude(selector);
  if (options.rules) builder = builder.withRules(options.rules);

  const results = await builder.analyze();
  // Violations and "needs review" items in full; passing rules only by id, to keep the report small.
  const summary = {
    url: results.url,
    violations: results.violations,
    incomplete: results.incomplete,
    passes: results.passes.map(rule => rule.id),
  };
  await test.info().attach('axe-results.json', {
    body: JSON.stringify(summary, null, 2),
    contentType: 'application/json',
  });
  return results;
}

/** Fails with one readable line per violation: rule, impact, what to fix and which elements. */
export function expectNoViolations(results: AxeResults): void {
  expect(results.violations.map(describeViolation), `Accessibility violations on ${results.url}`).toEqual([]);
}

function describeViolation(violation: Violation): string {
  const targets = violation.nodes.map(node => node.target.join(' ')).join(', ');
  return `[${violation.impact ?? 'unknown'}] ${violation.id}: ${violation.help} -> ${targets}`;
}
