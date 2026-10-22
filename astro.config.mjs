// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// Static site, German first. Every page lives under /de/ or /en/; "/" redirects to /de/.
export default defineConfig({
  output: 'static',
  // Built CSS/JS/images go to dist/assets/ (not the default _astro/): some hosts reserve names starting with "_"
  build: { assets: 'assets' },
  integrations: [mdx()],
  i18n: {
    defaultLocale: 'de',
    locales: ['de', 'en'],
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
  vite: {
    // JS chunks load each other by relative URL, so the built site also works from a sub-folder
    // (see scripts/export-artifact.mjs).
    experimental: { renderBuiltUrl: (_file, { hostType }) => (hostType === 'js' ? { relative: true } : undefined) },
  },
});
