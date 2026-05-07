// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://carnet.aliceosdel.org',
  trailingSlash: 'ignore',
  // SSR via Node : chaque requête tape Payload (réseau docker
  // interne en prod, localhost:3001 en dev). Pas de rebuild CI
  // à chaque save d'Alice — édition instantanément visible.
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  build: {
    format: 'directory',
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes('/cms') &&
        !page.includes('/status'),
      i18n: {
        defaultLocale: 'fr',
        locales: { fr: 'fr-FR' },
      },
    }),
  ],
  image: {
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
});
