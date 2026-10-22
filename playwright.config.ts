// End-to-end tests: accessibility (axe), filters, menu, language toggle and every Stage format,
// at phone and desktop width. Run `npm run build` first; the tests use `astro preview` on dist/.
import { defineConfig, devices } from '@playwright/test';

const webgl = { args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] };

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4322' },
  webServer: {
    command: 'npx astro preview --port 4322 --ignore-lock',
    url: 'http://localhost:4322/de/',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 }, launchOptions: webgl } },
    { name: 'phone', use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 780 }, hasTouch: true, launchOptions: webgl } },
  ],
});
