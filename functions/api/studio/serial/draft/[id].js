// PUT /api/studio/serial/draft/:id — 검수본 저장 (members가 있으면 묶음, :id가 대표 절)
import { guard, json, fail, readJson, cleanMeta, nowKst, resolveMembers, bundleStatements, BOOK } from "../../../../../lib/studio.js";

export async function onRequestPut({ request, env, params }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  const { body, error } = await readJson(request, 1_500_000);
  if (error) return error;
  const draft = String(body?.draft ?? "");
  const meta = cleanMeta(body?.meta);
  const list = await resolveMembers(g.db, params.id, body?.members);
  if (!list) return fail(400, "invalid", "묶을 절은 이어진 순서여야 합니다.");
  const at = nowKst();
  const prev = await g.db.prepare("SELECT status FROM studio_progress WHERE book = ? AND id = ?").bind(BOOK, params.id).first();
  const status = prev?.status === "published" ? "published" : "reviewed";
  await g.db.batch([
    g.db.prepare(
      "INSERT INTO studio_progress (book, id, status, draft, meta, members, lead, updated_at) VALUES (?, ?, ?, ?, ?, ?, NULL, ?) " +
      "ON CONFLICT(book, id) DO UPDATE SET status = excluded.status, draft = excluded.draft, meta = excluded.meta, members = excluded.members, lead = NULL, updated_at = excluded.updated_at"
    ).bind(BOOK, params.id, status, draft, JSON.stringify(meta), list.length > 1 ? JSON.stringify(list) : null, at),
    ...bundleStatements(g.db, params.id, list, status, at),
  ]);
  return json({ ok: true, updatedAt: at });
}
