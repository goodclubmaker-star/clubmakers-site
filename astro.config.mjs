import { defineConfig } from 'astro/config';
// import sitemap from '@astrojs/sitemap'; // 페이지 12개 다 만들어진 후 활성화

// https://astro.build/config
export default defineConfig({
  site: 'https://myclubmakers.com',
  integrations: [
    // sitemap(...) 추후 활성화
  ],
  build: {
    format: 'directory',
  },
  // 한국어 사이트
  i18n: {
    defaultLocale: 'ko',
    locales: ['ko'],
  },
});
