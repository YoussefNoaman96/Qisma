import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function socialMetadata() {
  let base = '/';
  return {
    name: 'qisma-social-metadata',
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml() {
      const value = process.env.PUBLIC_SITE_URL;
      const publicUrl = value ? new URL(value) : null;
      if (publicUrl && publicUrl.protocol !== 'https:')
        throw new Error('PUBLIC_SITE_URL must use HTTPS.');
      const image = publicUrl
        ? new URL('brand/social-preview.png', publicUrl.href.replace(/\/?$/u, '/')).href
        : `${base}brand/social-preview.png`;
      const tags = [
        ['og:type', 'website'],
        ['og:site_name', 'Qisma'],
        ['og:title', 'Qisma — Split fairly, stay friends'],
        [
          'og:description',
          'Shared expenses, clear balances. Optional accounts, private history, and PDF reports in English and Arabic.',
        ],
        ['og:image', image],
        ['og:image:width', '1200'],
        ['og:image:height', '630'],
        ['og:image:alt', 'Qisma: fair shares and clear balances'],
      ].map(([property, content]) => ({ tag: 'meta', attrs: { property, content } }));
      tags.push({ tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } });
      if (publicUrl)
        tags.push(
          { tag: 'meta', attrs: { property: 'og:url', content: publicUrl.href } },
          { tag: 'link', attrs: { rel: 'canonical', href: publicUrl.href } },
        );
      return tags;
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss(), socialMetadata()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://127.0.0.1:3001',
        changeOrigin: false,
      },
    },
  },
});
