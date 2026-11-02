// POST /api/studio/post/:id/publish — 일반 작업일지 등록 (사진과 함께 한 커밋)
import { guard, json, fail, readJson, cleanMeta, publishJournal, nowKst } from "../../../../../lib/studio.js";

export async function onRequestPost({ request, env, params }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  const { body, error } = await readJson(request, 1_500_000);
  if (error) return error;
  const draft = String(body?.draft ?? "").trim();
  if (draft.length < 10) return fail(400, "empty", "본문이 비어 있습니다.");
  const meta = cleanMeta({ ...body?.meta, series: "" });
  if (meta.category === "series") meta.category = "log"; // 연재 분류는 원고 연재 전용
  if (!meta.title) return fail(400, "invalid", "제목을 입력해 주세요.");
  const row = await g.db.prepare("SELECT file FROM studio_posts WHERE id = ?").bind(params.id).first();
  if (!row) return fail(404, "not_found", "글이 없습니다.");
  const file = row.file || `${meta.pubDate}-${meta.slug || "log-" + params.id.slice(1, 7)}.md`;
  const r = await publishJournal(env, g.db, { file, meta, body: draft, message: `공작소 일지: ${meta.title}` });
  if (!r.ok) return fail(r.status, r.code, r.message);
  const at = nowKst();
  await g.db.prepare("UPDATE studio_posts SET status = 'published', draft = ?, meta = ?, file = ?, commit_url = ?, updated_at = ? WHERE id = ?")
    .bind(draft, JSON.stringify(meta), file, r.commitUrl, at, params.id).run();
  return json({ ok: true, file, updated: r.updated, commitUrl: r.commitUrl, journalUrl: `/journal/${file.replace(/\.md$/, "")}/` });
}
