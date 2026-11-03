// /api/studio/post — 일반 작업일지 (원고 연재가 아닌 글)
// GET → 목록    POST → 새 글 만들기 {id}
import { guard, json, nowKst } from "../../../../lib/studio.js";

export async function onRequestGet({ request, env }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  const rows = (await g.db.prepare("SELECT id, status, meta, file, updated_at FROM studio_posts ORDER BY updated_at DESC LIMIT 200").all()).results;
  return json({ posts: rows.map(r => {
    let meta = {};
    try { meta = JSON.parse(r.meta || "{}"); } catch {}
    return { id: r.id, status: r.status, title: meta.title || "", pubDate: meta.pubDate || "", naver: !!meta.naverUrl, file: r.file, updatedAt: r.updated_at };
  }) });
}
export async function onRequestPost({ request, env }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  const id = "p" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const at = nowKst();
  await g.db.prepare("INSERT INTO studio_posts (id, status, draft, meta, updated_at) VALUES (?, 'draft', '', ?, ?)")
    .bind(id, JSON.stringify({ pubDate: at.slice(0, 10), category: "log", tags: [] }), at).run();
  return json({ ok: true, id });
}
