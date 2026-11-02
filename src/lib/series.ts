// 공작소 일지 연재 정의
import { getCollection, type CollectionEntry } from 'astro:content';

export const SERIES: Record<string, { name: string; short: string; path: string; lead: string }> = {
  'practical-fitting': {
    name: '새로 쓰는 『실제적인 클럽피팅』',
    short: '실제적인 클럽피팅',
    path: '/journal/series/practical-fitting/',
    lead: '『실제적인 클럽피팅』 원고를 처음부터 다시 읽으며 한 편씩 손보아 올립니다. 인터뷰에서 시작해 판단 구조, 볼 비행, 헤드와 샤프트, 론치모니터 해석까지 책의 순서를 따라갑니다.',
  },
};

// 발행된 연재 글을 원고 순서대로
export async function seriesEntries(key: string) {
  const now = new Date();
  const all = await getCollection('journal', ({ data }) => data.draft !== true && data.pubDate <= now && data.series === key);
  return all.sort((a, b) =>
    (a.data.seriesNo ?? 1e9) - (b.data.seriesNo ?? 1e9) || a.data.pubDate.valueOf() - b.data.pubDate.valueOf());
}

export function seriesNeighbors(list: CollectionEntry<'journal'>[], slug: string) {
  const i = list.findIndex(e => e.slug === slug);
  return { index: i, prev: i > 0 ? list[i - 1] : null, next: i >= 0 && i < list.length - 1 ? list[i + 1] : null };
}
