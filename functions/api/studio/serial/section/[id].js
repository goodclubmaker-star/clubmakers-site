// GET /api/studio/serial/section/:id — 원문 + 저장된 검수본
import { guard, json, fail , BOOK } from "../../../../../lib/studio.js";

export async function onRequestGet({ request, env, params }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  const [sec, prog] = await g.db.batch([
    g.db.prepare("SELECT id, ord, grp, title, body FROM studio_sections WHERE book = ? AND id = ?").bind(BOOK, params.id),
    g.db.prepare("SELECT status, draft, meta, file, commit_url, updated_at FROM studio_progress WHERE book = ? AND id = ?").bind(BOOK, params.id),
  ]);
  const s = sec.results[0];
  if (!s) return fail(404, "not_found", "해당 원고가 없습니다.");
  const p = prog.results[0] || null;
  let meta = null;
  try { meta = p?.meta ? JSON.parse(p.meta) : null; } catch {}
  return json({ section: { id: s.id, ord: s.ord, group: s.grp, title: s.title, text: s.body },
    progress: p ? { status: p.status, draft: p.draft || "", meta, file: p.file, commitUrl: p.commit_url, updatedAt: p.updated_at } : null });
}
