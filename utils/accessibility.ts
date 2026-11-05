import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

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

/** Waits for finite animations (MUI fades, ripples) to finish. Infinite ones, like spinners, are ignored. */
export async function waitForAnimationsToSettle(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(animation => animation.playState !== 'running' || animation.effect?.getTiming().iterations === Infinity),
  );
}

/**
 * Scans the current page with axe-core and attaches the results to the test report.
 *
 * Waits for animations to finish first: MUI dialogs fade in, and a scan taken mid-fade reports
 * colour-contrast failures for text that is still partly transparent.
 *
 * axe cannot judge contrast for most text in this app: it sits over an animated particle canvas or a
 * gradient, so axe lists it under "incomplete" (needs review). Contrast is checked against the rendered
 * pixels by {@link measureTextContrast} instead.
 */
export async function scanAccessibility(page: Page, options: ScanOptions = {}): Promise<AxeResults> {
  await waitForAnimationsToSettle(page);

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

export type ContrastResult = {
  text: string;
  /** The text's CSS colour. */
  color: string;
  /** Lowest contrast ratio found along the text, against what is actually painted behind it. 1 if not painted. */
  ratio: number;
  /** WCAG 1.4.3 minimum: 3 for large text (24px, or 18.66px bold), 4.5 otherwise. */
  required: number;
  /** False when none of the text's pixels reach the screen, e.g. it is covered by another layer. */
  rendered: boolean;
};

const HIDE_TEXT_CSS =
  '[data-contrast-probe], [data-contrast-probe] * { color: transparent !important; ' +
  '-webkit-text-fill-color: transparent !important; caret-color: transparent !important; text-shadow: none !important; }';

/**
 * Measures the contrast of an element's text against the pixels rendered behind it.
 *
 * Takes two screenshots of the element, with its text shown and with its text made transparent, so the second
 * one is exactly the background the text is painted on: canvas, gradient, glow and all. The element is split
 * into 6px-wide strips; in each strip that contains glyphs the background is the median colour, compared with
 * the text's CSS colour. The result is the worst strip, so white text that fades into a light end of a gradient
 * is caught. The particle canvas is frozen first, so both screenshots share the same background.
 */
export async function measureTextContrast(target: Locator): Promise<ContrastResult> {
  const page = target.page();
  await waitForAnimationsToSettle(page);
  await page.evaluate(async () => {
    window.requestAnimationFrame = () => 0;
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  const style = await target.evaluate(element => {
    const computed = getComputedStyle(element);
    const text = element instanceof HTMLInputElement ? element.value : (element as HTMLElement).innerText;
    return {
      text: text.trim().slice(0, 60),
      color: computed.color,
      large:
        parseFloat(computed.fontSize) >= 24 ||
        (parseFloat(computed.fontSize) >= 18.66 && parseInt(computed.fontWeight, 10) >= 700),
    };
  });

  const withText = await target.screenshot({ animations: 'disabled' });
  await target.evaluate(element => element.setAttribute('data-contrast-probe', ''));
  const hideText = await page.addStyleTag({ content: HIDE_TEXT_CSS });
  const background = await target.screenshot({ animations: 'disabled' });
  await hideText.evaluate(tag => (tag as Element).remove());
  await target.evaluate(element => element.removeAttribute('data-contrast-probe'));

  const measured = await page.evaluate(
    async ({ withText, background, color }) => {
      const pixels = async (base64: string) => {
        const image = new Image();
        image.src = `data:image/png;base64,${base64}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, image.width, image.height);
      };
      const [fg, bg] = [await pixels(withText), await pixels(background)];
      const channel = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      const luminance = (c: number[]) => 0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2]);
      const contrast = (a: number[], b: number[]) => {
        const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
        return (high + 0.05) / (low + 0.05);
      };
      const [r, g, b, alpha = 1] = (color.match(/[\d.]+/g) ?? []).map(Number);
      const median = (values: number[]) => values.sort((x, y) => x - y)[Math.floor(values.length / 2)];

      let worst = Infinity;
      for (let stripX = 0; stripX < fg.width; stripX += 6) {
        const reds: number[] = [];
        const greens: number[] = [];
        const blues: number[] = [];
        let glyphPixels = 0;
        for (let x = stripX; x < Math.min(stripX + 6, fg.width); x++) {
          for (let y = 0; y < fg.height; y++) {
            const i = (y * fg.width + x) * 4;
            const difference =
              Math.abs(fg.data[i] - bg.data[i]) +
              Math.abs(fg.data[i + 1] - bg.data[i + 1]) +
              Math.abs(fg.data[i + 2] - bg.data[i + 2]);
            if (difference > 30) glyphPixels++;
            reds.push(bg.data[i]);
            greens.push(bg.data[i + 1]);
            blues.push(bg.data[i + 2]);
          }
        }
        // Strips without glyphs (padding, borders) say nothing about the text.
        if (glyphPixels === 0) continue;
        const behind = [median(reds), median(greens), median(blues)];
        const text = [r, g, b].map((value, k) => alpha * value + (1 - alpha) * behind[k]);
        worst = Math.min(worst, contrast(text, behind));
      }
      return Number.isFinite(worst) ? { ratio: worst, rendered: true } : { ratio: 1, rendered: false };
    },
    { withText: withText.toString('base64'), background: background.toString('base64'), color: style.color },
  );

  return {
    text: style.text,
    color: style.color,
    ratio: Math.round(measured.ratio * 100) / 100,
    required: style.large ? 3 : 4.5,
    rendered: measured.rendered,
  };
}

/** Asserts WCAG 1.4.3 contrast for an element's text, measured on screen. Pass `soft` to keep checking others. */
export async function expectSufficientContrast(target: Locator, options: { soft?: boolean } = {}): Promise<void> {
  const result = await measureTextContrast(target);
  const assert = options.soft ? expect.soft : expect;
  const detail = result.rendered
    ? `"${result.text}" (${result.color}) has a contrast ratio of ${result.ratio}:1, needs ${result.required}:1`
    : `"${result.text}" (${result.color}) is not painted on screen at all: something covers it`;
  assert(result.rendered && result.ratio >= result.required, detail).toBe(true);
}
