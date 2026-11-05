import type { TestDetails } from '@playwright/test';

/** Tag every known-bug test carries. The known-defects reporter keys on it. */
export const KNOWN_BUG_TAG = '@known-bug';
/** Annotation holding the issue reference and a description of the defect. */
export const ISSUE_ANNOTATION = 'issue';
/** Annotation holding the source of the regular expression the failure message must match. */
export const EXPECTED_FAILURE_ANNOTATION = 'expected-failure';

export type KnownBug = {
  /** Where the defect is reported, e.g. "Zetyre/redux-athena-bank#4". */
  issue: `${string}/${string}#${number}`;
  /** What is wrong, in one or two sentences. */
  summary: string;
  /**
   * What the failure looks like while the defect is present. Every error of the test must match it, so a test that
   * fails for another reason (a broken selector, a timeout, a setup error) is reported instead of counted as the
   * known defect.
   */
  fails: RegExp;
};

/**
 * Details for a test that asserts the correct behaviour of a defect still present in the app. The test must also
 * call `test.fail()`, so it reports as "expected to fail" today and fails loudly once the defect is fixed.
 * The known-defects reporter lists these tests separately and fails the run when one fails for the wrong reason.
 */
export function knownBug({ issue, summary, fails }: KnownBug): TestDetails {
  if (fails.flags)
    throw new Error(`knownBug: use an expected-failure pattern without flags, got /${fails.source}/${fails.flags}`);
  return {
    tag: ['@regression', KNOWN_BUG_TAG],
    annotation: [
      { type: ISSUE_ANNOTATION, description: `${issue}. ${summary} Remove test.fail() once the app is fixed.` },
      { type: EXPECTED_FAILURE_ANNOTATION, description: fails.source },
    ],
  };
}

/** Escapes text for use inside a regular expression. */
export const literal = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The failure `expectSufficientContrast` reports for text that is painted but too faint. */
export const lowContrast = (textStart: string): RegExp =>
  new RegExp(`"${literal(textStart)}[^"]*" \\(rgba?\\([^)]*\\)\\) has a contrast ratio of [\\d.]+:1, needs [\\d.]+:1`);

/** The failure `expectSufficientContrast` reports for text that is covered by another layer. */
export const notPainted = (textStart: string): RegExp =>
  new RegExp(`"${literal(textStart)}[^"]*" \\(rgba?\\([^)]*\\)\\) is not painted on screen at all`);
