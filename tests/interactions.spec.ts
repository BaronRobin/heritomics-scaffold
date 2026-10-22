// Interactions: skip link, language toggle, phone menu, index filters, and the Stage for every format.
import { test, expect } from '@playwright/test';

test('skip link moves focus to the content', async ({ page }) => {
  await page.goto('/de/');
  await page.keyboard.press('Tab');
  const skip = page.locator('.skip-link');
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#inhalt')).toBeFocused();
});

test('language toggle keeps you on the same page', async ({ page }, info) => {
  await page.goto('/de/erlebnisse/leben-aus-nebel/');
  if (info.project.name === 'phone') await page.getByRole('button', { name: 'Menü' }).click();
  await page.locator('.lang a[hreflang="en"]:visible').click();
  await expect(page).toHaveURL(/\/en\/experiences\/leben-aus-nebel\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('phone menu is a modal dialog that closes with Escape', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'menu button only on phones');
  await page.goto('/en/');
  const button = page.getByRole('button', { name: 'Menu' });
  await button.click();
  const dialog = page.getByRole('dialog', { name: 'Menu' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(button).toBeFocused();
});

test('index filters show matching cards and announce the count', async ({ page }) => {
  await page.goto('/en/experiences/');
  const cards = page.locator('[data-card]:visible');
  await expect(cards).toHaveCount(3);
  await page.locator('[data-filter="format"] button[data-value="video"]').click();
  await expect(cards).toHaveCount(1);
  await expect(page.locator('[data-filter-status]')).toHaveText('1 experience shown.');
  await page.locator('[data-filter-reset]').click();
  await expect(cards).toHaveCount(3);
});

// Every format: nothing heavy before Start; Start mounts without error; Stop restores the poster and focus.
const formats = [
  { format: 'model3d', url: '/de/erlebnisse/leben-aus-nebel/' },
  { format: 'video', url: '/de/erlebnisse/kaelte-als-zuhause/' },
  { format: 'webxr', url: '/de/erlebnisse/im-dunkeln-wachsen/' },
  { format: 'images', url: '/de/erlebnisse/sample-images/' },
  { format: 'canvas', url: '/en/experiences/sample-canvas/' },
  { format: 'iframe (build)', url: '/en/experiences/sample-build/' },
  { format: 'iframe (pixel streaming)', url: '/en/experiences/sample-pixelstreaming/' },
  { format: 'splat', url: '/en/experiences/sample-splat/' },
];
const heavy = /\/assets\/(three|spark|video|images|canvas|iframe|model3d|webxr|splat)[.\w-]*\.js|\/media\/|\/builds\/|example\.org/;

for (const { format, url } of formats) {
  test(`stage: ${format}`, async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    const response = await page.goto(url);
    test.skip(response?.status() === 404, `${url} does not exist yet`);
    await page.waitForLoadState('networkidle');
    expect(requests.filter((u) => heavy.test(u)), 'nothing heavy before Start').toEqual([]);

    const stage = page.locator('[data-stage]');
    await stage.locator('[data-stage-start]').click();
    await expect(stage.locator('[data-stage-running]')).toBeVisible();
    await expect(stage.locator('[data-stage-progress]')).toBeHidden({ timeout: 30_000 });
    await expect(stage.locator('[data-stage-error]')).toBeHidden();

    await stage.locator('[data-stage-stop]').click();
    await expect(stage.locator('[data-stage-poster]')).toBeVisible();
    await expect(stage.locator('[data-stage-start]')).toBeFocused();
    expect(errors, 'no script errors').toEqual([]);
  });
}
