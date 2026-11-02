// PUT /api/studio/serial/draft/:id — 검수본 저장
import { guard, json, fail, readJson, cleanMeta, nowKst , BOOK } from "../../../../../lib/studio.js";

export async function onRequestPut({ request, env, params }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  const { body, error } = await readJson(request, 400_000);
  if (error) return error;
  const draft = String(body?.draft ?? "");
  const meta = cleanMeta(body?.meta);
  const exists = await g.db.prepare("SELECT 1 FROM studio_sections WHERE book = ? AND id = ?").bind(BOOK, params.id).first();
  if (!exists) return fail(404, "not_found", "해당 원고가 없습니다.");
  const at = nowKst();
  await g.db.prepare(
    "INSERT INTO studio_progress (book, id, status, draft, meta, updated_at) VALUES (?, ?, 'reviewed', ?, ?, ?) " +
    "ON CONFLICT(book, id) DO UPDATE SET draft = excluded.draft, meta = excluded.meta, updated_at = excluded.updated_at, " +
    "status = CASE WHEN studio_progress.status = 'published' THEN 'published' ELSE 'reviewed' END"
  ).bind(BOOK, params.id, draft, JSON.stringify(meta), at).run();
  return json({ ok: true, updatedAt: at });
}
