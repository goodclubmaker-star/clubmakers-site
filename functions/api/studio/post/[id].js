// /api/studio/post/:id — GET 글 불러오기, PUT 저장, DELETE 삭제(등록 전만)
import { guard, json, fail, readJson, cleanMeta, nowKst } from "../../../../lib/studio.js";

export async function onRequestGet({ request, env, params }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  const r = await g.db.prepare("SELECT id, status, draft, meta, file, commit_url, updated_at FROM studio_posts WHERE id = ?").bind(params.id).first();
  if (!r) return fail(404, "not_found", "글이 없습니다.");
  let meta = {};
  try { meta = JSON.parse(r.meta || "{}"); } catch {}
  return json({ post: { id: r.id, status: r.status, draft: r.draft || "", meta, file: r.file, commitUrl: r.commit_url, updatedAt: r.updated_at } });
}
export async function onRequestPut({ request, env, params }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  const { body, error } = await readJson(request, 1_500_000);
  if (error) return error;
  const at = nowKst();
  const res = await g.db.prepare("UPDATE studio_posts SET draft = ?, meta = ?, updated_at = ? WHERE id = ?")
    .bind(String(body?.draft ?? ""), JSON.stringify(cleanMeta(body?.meta)), at, params.id).run();
  if (!res.meta?.changes) return fail(404, "not_found", "글이 없습니다.");
  return json({ ok: true, updatedAt: at });
}
export async function onRequestDelete({ request, env, params }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  const r = await g.db.prepare("SELECT status FROM studio_posts WHERE id = ?").bind(params.id).first();
  if (!r) return json({ ok: true });
  if (r.status === "published") return fail(400, "published", "이미 등록한 글은 여기서 지울 수 없습니다.");
  await g.db.batch([
    g.db.prepare("DELETE FROM studio_posts WHERE id = ?").bind(params.id),
    g.db.prepare("DELETE FROM studio_photos WHERE owner = ?").bind(params.id),
  ]);
  return json({ ok: true });
}
