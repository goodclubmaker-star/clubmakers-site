/**
 * 관련 글 찾기 — 공작소 지식망의 뼈대
 *
 * 저널 글끼리, 그리고 저널 ↔ 용어사전을 연결합니다.
 * AI를 쓰지 않습니다. 빌드할 때 태그·클럽·증상·본문 링크를 대조해 점수를 냅니다.
 * 그래서 비용이 0이고, 글이 늘어날수록 연결이 저절로 촘촘해집니다.
 */

import type { CollectionEntry } from 'astro:content';

type Journal = CollectionEntry<'journal'>;

/** 발행된 글만. draft 제외 + 예약(미래 날짜) 제외. */
export function published<T extends { data: { draft?: boolean; pubDate: Date } }>(
  entries: T[],
  now: Date = new Date()
): T[] {
  return entries.filter((e) => e.data.draft !== true && e.data.pubDate <= now);
}

/** 본문에서 용어사전 링크 slug를 뽑아낸다. 자동 링크가 걸어 둔 것을 그대로 활용. */
export function glossarySlugs(entry: Journal): Set<string> {
  const out = new Set<string>();
  const re = /\/glossary\/([a-z0-9-]+)\/?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(entry.body)) !== null) out.add(m[1]);
  return out;
}

/** 본문이 참조하는 저서 PART 번호. 예: /book/part-9/ → 9 */
export function bookParts(entry: Journal): Set<number> {
  const out = new Set<number>();
  const re = /\/book\/part-(\d+)\/?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(entry.body)) !== null) out.add(Number(m[1]));
  return out;
}

/**
 * 두 글이 얼마나 가까운지 점수를 낸다.
 *
 * 태그와 증상에 높은 점수를 준 이유: 카테고리는 네 개뿐이라 변별력이 없고,
 * "슬라이스"처럼 독자가 실제로 검색하는 말이 태그와 증상에 들어 있기 때문입니다.
 */
export function score(a: Journal, b: Journal): number {
  let s = 0;

  const ta = new Set(a.data.tags ?? []);
  for (const t of b.data.tags ?? []) if (ta.has(t)) s += 3;

  if (a.data.relatedSymptom && a.data.relatedSymptom === b.data.relatedSymptom) s += 3;
  if (a.data.clubType && a.data.clubType === b.data.clubType) s += 2;
  if (a.data.category === b.data.category) s += 1;

  // 같은 용어를 다룬 글끼리 이어 준다 — 지식망의 핵심 고리
  const ga = glossarySlugs(a);
  const gb = glossarySlugs(b);
  for (const g of gb) if (ga.has(g)) s += 2;

  // 같은 PART를 근거로 삼은 글끼리
  const ba = bookParts(a);
  for (const p of bookParts(b)) if (ba.has(p)) s += 2;

  return s;
}

/** 이 글과 «같이 읽으면 좋은 글» 3~5편. 점수가 0이면 넣지 않는다. */
export function relatedPosts(entry: Journal, all: Journal[], limit = 4): Journal[] {
  return published(all)
    .filter((e) => e.slug !== entry.slug)
    .map((e) => ({ e, s: score(entry, e) }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s || y.e.data.pubDate.valueOf() - x.e.data.pubDate.valueOf())
    .slice(0, limit)
    .map((x) => x.e);
}

/** 이 용어를 실제로 다룬 저널 글. 용어사전 페이지에서 씁니다. */
export function postsUsingTerm(termSlug: string, all: Journal[], limit = 5): Journal[] {
  return published(all)
    .filter((e) => glossarySlugs(e).has(termSlug))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
    .slice(0, limit);
}

/** 이 PART를 근거로 쓴 저널 글. 저서 페이지에서 씁니다. */
export function postsFromPart(part: number, all: Journal[], limit = 5): Journal[] {
  return published(all)
    .filter((e) => bookParts(e).has(part))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
    .slice(0, limit);
}
