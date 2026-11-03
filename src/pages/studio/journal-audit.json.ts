// 작업대 'SEO 점검'용 — 발행된 공작소 일지 전체 (빌드할 때 만들어짐)
import { getCollection } from 'astro:content';

export async function GET() {
  const now = new Date();
  const all = await getCollection('journal', ({ data }) => data.draft !== true && data.pubDate <= now);
  const posts = all
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
    .map((e) => ({
      slug: e.slug,
      file: e.id,
      url: `/journal/${e.slug}/`,
      title: e.data.title,
      description: e.data.description || '',
      tags: e.data.tags || [],
      category: e.data.category,
      series: e.data.series || '',
      cover: e.data.cover || '',
      pubDate: e.data.pubDate.toISOString(),
      body: e.body,
    }));
  return new Response(JSON.stringify({ builtAt: now.toISOString(), posts }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
