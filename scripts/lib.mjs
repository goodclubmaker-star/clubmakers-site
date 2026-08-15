/**
 * 공작소 일지 자동 발행 — 공용 라이브러리
 * 외부 의존성 없이 Node 22 내장 기능만 씁니다.
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

export const ROOT = path.resolve(import.meta.dirname, '..');
export const JOURNAL_DIR = path.join(ROOT, 'src/content/journal');
export const GLOSSARY_DIR = path.join(ROOT, 'src/content/glossary');
export const DATA_DIR = path.join(import.meta.dirname, 'data');

/* ══ 공통 문체 ══════════════════════════════════════════════ */

export const VOICE = `
당신은 1985년부터 운영해 온 한국 골프클럽 피팅 공작소 '클럽메이커스'의 필자입니다.
공작소장 채기웅은 측정 데이터와 실제 작업으로 판단하는 사람입니다.

문체
- 한국어 존댓말(-습니다/-입니다). 담백하고 조용한 어조.
- 과장 금지: "최고", "완벽", "혁신", "놀라운", "비법", "무조건", "강력 추천" 사용 금지.
- 이모지, 감탄사, 마케팅 문구 금지.
- 치료·의학적 효과를 단정하지 마십시오. 장비와 측정에 대해서만 말합니다.

사실 규칙 — 가장 중요합니다
- 주어진 자료에 없는 사실을 지어내지 마십시오.
  제품명, 가격, 출시일, 스펙, 선수 이름, 대회 결과, 성적은 자료에 있는 것만 씁니다.
- 자료에 없으면 "공개되지 않았습니다" 또는 아예 언급하지 마십시오.
- 구체적 수치를 추측해 쓰지 마십시오. 범위로 말하거나 측정이 필요하다고 쓰십시오.
- 실존 인물의 발언을 지어내지 마십시오.
- 특정 손님 일화를 지어내지 마십시오. "한 손님이 오셨습니다" 같은 허구 금지.
  대신 "이런 경우가 많습니다"처럼 일반화해 서술하십시오.

독자는 자기 클럽에 문제를 느끼는 아마추어 골퍼입니다.
`.trim();

/* ══ OpenAI ════════════════════════════════════════════════ */

export async function ask(system, user, { retries = 3 } = {}) {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o';
  if (!key) throw new Error('OPENAI_API_KEY가 없습니다.');

  for (let n = 1; n <= retries; n++) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (res.ok) {
      const j = await res.json();
      return JSON.parse(j.choices[0].message.content);
    }
    const body = await res.text().catch(() => '');
    if (n < retries && (res.status === 429 || res.status >= 500)) {
      const wait = n * 6000;
      log(`  OpenAI ${res.status} — ${wait / 1000}초 후 재시도 (${n}/${retries})`);
      await sleep(wait);
      continue;
    }
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 300)}`);
  }
}

/* ══ RSS / Atom ════════════════════════════════════════════ */

const strip = (s = '') =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/\s+/g, ' ')
    .trim();

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? strip(m[1]) : '';
};

/** 피드 하나를 읽어 항목 배열로. 실패하면 빈 배열(예외를 던지지 않습니다). */
export async function fetchFeed(url, { timeout = 20000 } = {}) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeout),
      headers: { 'User-Agent': 'clubmakers-journal-bot/1.0 (+https://myclubmakers.com)' },
    });
    if (!res.ok) {
      log(`  ✗ ${url} — HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const chunks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) || [];
    const items = chunks.map((c) => {
      let link = tag(c, 'link');
      if (!link) {
        const a = c.match(/<link[^>]*href=["']([^"']+)["']/i);
        link = a ? a[1] : '';
      }
      return {
        title: tag(c, 'title'),
        link,
        date: tag(c, 'pubDate') || tag(c, 'published') || tag(c, 'updated'),
        summary: (tag(c, 'description') || tag(c, 'summary') || tag(c, 'content')).slice(0, 1800),
      };
    });
    const ok = items.filter((i) => i.title && i.link);
    log(`  ✓ ${url} — ${ok.length}건`);
    return ok;
  } catch (e) {
    log(`  ✗ ${url} — ${e.message}`);
    return [];
  }
}

/** 여러 피드를 모아 최신순 정렬. 살아 있는 것만 남습니다. */
export async function gather(urls, { days = 14 } = {}) {
  const all = (await Promise.all(urls.map((u) => fetchFeed(u)))).flat();
  const cut = Date.now() - days * 86400000;
  return all
    .map((i) => ({ ...i, ts: Date.parse(i.date) || 0 }))
    .filter((i) => !i.ts || i.ts >= cut)
    .sort((a, b) => b.ts - a.ts);
}

/* ══ 용어사전 자동 링크 ════════════════════════════════════ */

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * 용어사전을 읽어 { slug, ko(대표 표기), aliases[] } 목록으로.
 *
 * 사전에는 "라이 앵글"로 등재돼 있어도 글에서는 "라이각"이라고 쓰는 일이 잦습니다.
 * 그래서 koreanTitle·title·englishTitle에 더해 흔한 변형을 별칭으로 넣습니다.
 *   "라이 앵글" → "라이앵글", "라이각"
 *   "페이스 앵글" → "페이스앵글", "페이스각"
 */
function aliasesOf(ko, title, en) {
  const set = new Set();
  const add = (s) => { s = (s || '').trim(); if (s.length >= 2) set.add(s); };

  add(ko);
  add(en);
  // "라이 앵글 (Lie Angle)" 같은 제목에서 괄호 앞부분만
  add((title || '').replace(/\s*\(.*?\)\s*/g, '').trim());

  for (const base of [...set]) {
    if (/[가-힣]/.test(base) && base.includes(' ')) {
      add(base.replace(/\s+/g, ''));                 // 라이 앵글 → 라이앵글
      if (/앵글$/.test(base.replace(/\s+/g, ''))) {
        add(base.replace(/\s+/g, '').replace(/앵글$/, '각'));  // 라이앵글 → 라이각
      }
    }
  }
  return [...set].sort((a, b) => b.length - a.length);
}

export async function loadGlossary() {
  const files = (await readdir(GLOSSARY_DIR)).filter((f) => f.endsWith('.md'));
  const out = [];
  for (const f of files) {
    const fm = frontmatter(await readFile(path.join(GLOSSARY_DIR, f), 'utf8'));
    if (fm.draft === 'true') continue;
    const ko = (fm.koreanTitle || fm.title || '').trim();
    if (ko.length < 2) continue;
    out.push({
      slug: f.replace(/\.md$/, ''),
      ko,
      def: fm.shortDef || '',
      aliases: aliasesOf(ko, fm.title, fm.englishTitle),
    });
  }
  // 긴 용어부터 시도해야 "라이 앵글"이 "라이"보다 먼저 잡힙니다.
  return out.sort((a, b) => (b.aliases[0]?.length || 0) - (a.aliases[0]?.length || 0));
}

/** 글당 용어 하나에 첫 등장 한 번만. 제목·표·인용·코드는 건너뜁니다. */
export function linkGlossary(body, terms, skip = []) {
  const done = new Set(skip);
  return body
    .split('\n')
    .map((line) => {
      if (/^\s*(#{1,6}\s|\||>|```|---)/.test(line)) return line;
      for (const t of terms) {
        if (done.has(t.slug)) continue;
        for (const a of t.aliases) {
          const re = new RegExp(`(?<!\\[)${escapeRe(a)}(?!\\]|\\()`);
          if (re.test(line)) {
            line = line.replace(re, `[${a}](/glossary/${t.slug}/)`);
            done.add(t.slug);
            break;
          }
        }
      }
      return line;
    })
    .join('\n');
}

/** 글 쓸 때 모델에게 건넬 어휘표. 표기가 사전과 어긋나는 것을 줄입니다. */
export function vocabHint(terms, limit = 60) {
  return terms
    .filter((t) => t.def)
    .slice(0, limit)
    .map((t) => `${t.ko} — ${t.def}`)
    .join('\n');
}

/* ══ 마크다운 ══════════════════════════════════════════════ */

export function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const o = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (kv) o[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  return o;
}

const yq = (s) => `"${String(s).replace(/"/g, '\\"')}"`;

// config.ts 스키마와 정확히 일치해야 합니다.
const CATEGORIES = ['log', 'review', 'trends', 'data'];
const CLUBS = ['driver', 'fairway', 'hybrid', 'iron', 'wedge', 'putter', 'mixed'];

export function buildMarkdown({ title, description, tags, body, pubDate, category, clubType, symptom, sources }) {
  if (!CATEGORIES.includes(category)) category = 'log';
  if (clubType && !CLUBS.includes(clubType)) clubType = undefined;

  let text = body.trim();
  if (sources?.length) {
    text +=
      '\n\n## 출처\n\n' +
      sources.map((s) => `- [${s.title}](${s.link})`).join('\n');
  }

  const L = ['---', `title: ${yq(title)}`];
  if (description) L.push(`description: ${yq(description.slice(0, 150))}`);
  L.push(`pubDate: ${yq(pubDate)}`, `category: ${yq(category)}`);
  if (tags?.length) {
    L.push('tags:');
    tags.slice(0, 5).forEach((t) => L.push(`  - ${yq(t)}`));
  }
  if (clubType) L.push(`clubType: ${yq(clubType)}`);
  if (symptom) L.push(`relatedSymptom: ${yq(symptom)}`);
  L.push('draft: false', '---', '', text, '');
  return L.join('\n');
}

export function slugify(title, date) {
  const s = title
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50)
    .replace(/-+$/, '');
  return `${date}-${s}`;
}

/** KST 기준 YYYY-MM-DD */
export const ymd = (d = new Date()) =>
  new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);

export async function existingPosts() {
  try {
    const files = (await readdir(JOURNAL_DIR)).filter((f) => f.endsWith('.md'));
    return Promise.all(
      files.map(async (f) => {
        const raw = await readFile(path.join(JOURNAL_DIR, f), 'utf8');
        return { file: f, raw, ...frontmatter(raw) };
      })
    );
  } catch {
    return [];
  }
}

/* ══ 잡동사니 ══════════════════════════════════════════════ */

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const log = (...a) => console.log(...a);
export const readJSON = async (p, fallback) => {
  try {
    return JSON.parse(await readFile(p, 'utf8'));
  } catch {
    return fallback;
  }
};
