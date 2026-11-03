// 공작소 일지 묶음: 작업일지 / 컬럼 / 연재
import { getCollection, type CollectionEntry } from 'astro:content';

export const CATEGORY_LABELS: Record<string, { ko: string; emoji: string }> = {
  log:    { ko: '작업 일지',       emoji: '🔧' },
  data:   { ko: '측정 데이터',     emoji: '📏' },
  column: { ko: '컬럼',            emoji: '✍️' },
  review: { ko: '샤프트·헤드 리뷰', emoji: '📐' },
  trends: { ko: '장비 트렌드',     emoji: '📊' },
  series: { ko: '연재',            emoji: '📖' },
};

export const CLUB_LABELS: Record<string, string> = {
  driver: '드라이버', fairway: '페어웨이우드', hybrid: '하이브리드',
  iron: '아이언', wedge: '웨지', putter: '퍼터', mixed: '복합',
};

export type GroupKey = 'log' | 'column' | 'series';
export const GROUPS: Record<GroupKey, { name: string; en: string; lead: string; path: string; cats: string[] }> = {
  log: {
    name: '작업일지', en: 'WORKSHOP LOG', path: '/journal/log/', cats: ['log', 'data'],
    lead: '공작소에 들어온 클럽의 작업·측정·진단 기록입니다. 리샤프팅, 그립 교체, 라이·로프트 조정, 수리, 실측 데이터를 올립니다.',
  },
  column: {
    name: '컬럼', en: 'COLUMN', path: '/journal/column/', cats: ['column', 'review', 'trends'],
    lead: '공작소장의 생각과 제품 이야기입니다. 샤프트·헤드 리뷰, 신제품, 장비 흐름을 다룹니다.',
  },
  series: {
    name: '연재', en: 'SERIES', path: '/journal/series/practical-fitting/', cats: ['series'],
    lead: '새로 쓰는 『실제적인 클럽피팅』. 원고를 처음부터 다시 읽으며 한 편씩 올립니다.',
  },
};

export function groupOf(e: CollectionEntry<'journal'>): GroupKey {
  if (e.data.series || e.data.category === 'series') return 'series';
  return GROUPS.column.cats.includes(e.data.category) ? 'column' : 'log';
}

export async function publishedJournal() {
  const now = new Date();
  const all = await getCollection('journal', ({ data }) => data.draft !== true && data.pubDate <= now);
  return all.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function formatDateKst(date: Date) {
  return date.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' })
    .replace(/\. /g, '.').replace(/\.$/, '');
}
