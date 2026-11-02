// GET /api/studio/serial/state — 목차·진행 상태 (원고 본문 제외)
import { guard, json, BOOK } from "../../../../lib/studio.js";


export async function onRequestGet({ request, env }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  const [book, secs, prog] = await g.db.batch([
    g.db.prepare("SELECT source, count, uploaded_at FROM studio_books WHERE book = ?").bind(BOOK),
    g.db.prepare("SELECT id, ord, grp, title, length(body) AS len FROM studio_sections WHERE book = ? ORDER BY ord").bind(BOOK),
    g.db.prepare("SELECT id, status, file, commit_url, updated_at, (draft IS NOT NULL AND draft <> '') AS has_draft FROM studio_progress WHERE book = ?").bind(BOOK),
  ]);
  const progress = {};
  for (const r of prog.results) progress[r.id] = { status: r.status, file: r.file, commitUrl: r.commit_url, updatedAt: r.updated_at, hasDraft: !!r.has_draft };
  return json({ book: book.results[0] || null, sections: secs.results, progress });
}
