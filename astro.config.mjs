// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'https://myclubmakers.com';

// public/ 안의 정적 HTML(낭만공작소 작품, 스윙공작소 영문 등)도 sitemap에 포함.
// noindex 페이지와 개인정보·고객지원 페이지는 제외.
function staticPages(dir = 'public', base = '') {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = base + '/' + name;
    if (statSync(full).isDirectory()) { out.push(...staticPages(full, rel)); continue; }
    if (!name.endsWith('.html')) continue;
    if (/(privacy|support)(-en)?\.html$/.test(name)) continue;
    if (/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(readFileSync(full, 'utf8'))) continue;
    out.push(SITE + (name === 'index.html' ? rel.slice(0, -'index.html'.length) : rel));
  }
  return out;
}

export default defineConfig({
  site: SITE,
  trailingSlash: 'always',
  integrations: [sitemap({ customPages: staticPages() })],
  build: {
    format: 'directory',
  },
});
