import { defineConfig } from 'astro/config';

// When a custom domain is configured, remove `base` and update `site`.
export default defineConfig({
  site: 'https://puckrin.github.io',
  base: '/tidemarq-website',
  output: 'static',
});
