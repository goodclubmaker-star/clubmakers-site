import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

// 공작소 일지 RSS 피드 — /rss.xml
// 저널 페이지와 동일한 필터(draft 제외 + 예약 발행)를 써야 한다.
export async function GET(context) {
  const now = new Date();

  const posts = (
    await getCollection('journal', ({ data }) => {
      return data.draft !== true && data.pubDate <= now;
    })
  ).sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  return rss({
    title: '공작소 일지 | 골프채공작소 클럽메이커스',
    description:
      '증상 → 측정 → 진단 → 처방. 25년 공작소 현장의 작업 사례와 측정 데이터를 기록합니다.',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description ?? '',
      pubDate: post.data.pubDate,
      categories: post.data.tags,
      link: `/journal/${post.slug}/`,
    })),
    customData: '<language>ko</language>',
  });
}
