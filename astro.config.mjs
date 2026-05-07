// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://myclubmakers.com',
  // integrations: [sitemap()],  // 페이지 추가 후 활성화
  build: {
    format: 'directory',
  },
});
