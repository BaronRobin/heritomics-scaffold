// Every page in both languages: no axe violations (WCAG 2.2 A/AA) and no sideways scrolling.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = [
  '/de/', '/en/',
  '/de/erlebnisse/', '/en/experiences/',
  '/de/erlebnisse/leben-aus-nebel/', '/en/experiences/leben-aus-nebel/',
  '/de/erlebnisse/kaelte-als-zuhause/', '/en/experiences/kaelte-als-zuhause/',
  '/de/erlebnisse/im-dunkeln-wachsen/', '/en/experiences/im-dunkeln-wachsen/',
  '/de/ueber/', '/en/about/',
  '/de/impressum/', '/en/imprint/',
  '/de/datenschutz/', '/en/privacy/',
  '/de/styleguide/', '/en/styleguide/',
];

for (const url of pages) {
  test(`accessible: ${url}`, async ({ page }) => {
    const response = await page.goto(url);
    test.skip(response?.status() === 404, `${url} does not exist yet`);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
    expect(summary, `axe violations on ${url}`).toEqual([]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow, `${url} scrolls sideways`).toBe(false);
  });
}
