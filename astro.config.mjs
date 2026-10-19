// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'https://myclubmakers.com';

// ── 사이트맵은 골프만 ──────────────────────────────────────────
// myclubmakers.com sitemap = 골프채공작소 + 굿피팅 + 스윙공작소.
// 낭만공작소·개인 취미 작업(우울폭주성탄절, 웅토, 인생4초, 채CINE, 사투링고,
// 시날로아, 에세이텔라, 학습 페이지 등)은 sitemap에서 제외한다.
// 개인 작업 페이지를 새로 올리면 아래 목록에 경로 앞부분을 추가할 것.
const PERSONAL_PREFIXES = [
  '/nangman', '/blue-christmas', '/sinaloa', '/essaytella', '/satulinggo',
  '/woongto', '/chaecine', '/life4sec', '/study',
];
const isPersonal = (path) => PERSONAL_PREFIXES.some((p) => path === p || path.startsWith(p + '/') || path.startsWith(p + '-') || path.startsWith(p + '.'));

// public/ 안의 골프 관련 정적 HTML(스윙공작소 영문 등)만 sitemap에 포함.
// noindex 페이지와 개인정보·고객지원 페이지는 제외.
function staticPages(dir = 'public', base = '') {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = base + '/' + name;
    if (isPersonal(rel)) continue;
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
  integrations: [sitemap({
    customPages: staticPages(),
    filter: (page) => !isPersonal(new URL(page).pathname),
  })],
  build: {
    format: 'directory',
  },
});
