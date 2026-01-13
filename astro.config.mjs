import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://jeffrey0117.github.io',
  base: '/Evernote',
  markdown: {
    shikiConfig: {
      theme: 'github-light',
      wrap: true
    }
  }
});
