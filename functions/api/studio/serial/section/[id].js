// GET /api/studio/serial/section/:id[?to=sNNN] — 원문(묶음이면 이어지는 절 전체) + 대표 절의 검수본
import { guard, json, fail, BOOK } from "../../../../../lib/studio.js";

export async function onRequestGet({ request, env, params }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  const to = new URL(request.url).searchParams.get("to") || params.id;
  const ends = (await g.db.prepare("SELECT id, ord FROM studio_sections WHERE book = ? AND id IN (?, ?)").bind(BOOK, params.id, to).all()).results;
  const from = ends.find(r => r.id === params.id), last = ends.find(r => r.id === to);
  if (!from || !last || last.ord < from.ord || last.ord - from.ord > 79) return fail(404, "not_found", "해당 원고가 없습니다.");
  const [secs, prog] = await g.db.batch([
    g.db.prepare("SELECT id, ord, grp, title, body FROM studio_sections WHERE book = ? AND ord BETWEEN ? AND ? ORDER BY ord").bind(BOOK, from.ord, last.ord),
    g.db.prepare("SELECT status, draft, meta, file, commit_url, updated_at, members FROM studio_progress WHERE book = ? AND id = ?").bind(BOOK, params.id),
  ]);
  const p = prog.results[0] || null;
  let meta = null, members = null;
  try { meta = p?.meta ? JSON.parse(p.meta) : null; } catch {}
  try { members = p?.members ? JSON.parse(p.members) : null; } catch {}
  const sections = secs.results.map(s => ({ id: s.id, ord: s.ord, group: s.grp, title: s.title, text: s.body }));
  return json({ section: sections[0], sections,
    progress: p ? { status: p.status, draft: p.draft || "", meta, members, file: p.file, commitUrl: p.commit_url, updatedAt: p.updated_at } : null });
}
