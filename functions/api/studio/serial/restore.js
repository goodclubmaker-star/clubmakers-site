// POST /api/studio/serial/restore — 사이트에 이미 올라간 연재 글로 진행 상태를 되살린다 (GitHub 커밋 없음)
// body: { items: [{ id, members: [id...], file }] }
// 이미 '등록 완료'인 절은 건드리지 않고, 검수본·일지 정보는 그대로 둔다.
import { guard, json, fail, readJson, nowKst, resolveMembers, BOOK } from "../../../../lib/studio.js";

export async function onRequestPost({ request, env }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  const { body, error } = await readJson(request, 200_000);
  if (error) return error;
  const items = Array.isArray(body?.items) ? body.items.slice(0, 300) : [];
  if (!items.length) return json({ ok: true, restored: 0 });
  const at = nowKst();
  const stmts = [];
  let restored = 0;
  for (const it of items) {
    const id = String(it?.id || "");
    const file = String(it?.file || "");
    if (!/^s\d{3,4}$/.test(id) || !/^[\w.-]+\.md$/.test(file)) continue;
    const list = await resolveMembers(g.db, id, it.members);
    if (!list) continue;
    const cur = await g.db.prepare("SELECT status FROM studio_progress WHERE book = ? AND id = ?").bind(BOOK, id).first();
    if (cur?.status === "published") continue;
    restored++;
    stmts.push(g.db.prepare(
      "INSERT INTO studio_progress (book, id, status, file, members, lead, updated_at) VALUES (?, ?, 'published', ?, ?, NULL, ?) " +
      "ON CONFLICT(book, id) DO UPDATE SET status = 'published', file = excluded.file, members = excluded.members, lead = NULL, updated_at = excluded.updated_at"
    ).bind(BOOK, id, file, list.length > 1 ? JSON.stringify(list) : null, at));
    for (const m of list.slice(1)) stmts.push(g.db.prepare(
      "INSERT INTO studio_progress (book, id, status, lead, updated_at) VALUES (?, ?, 'published', ?, ?) " +
      "ON CONFLICT(book, id) DO UPDATE SET status = 'published', lead = excluded.lead, members = NULL, updated_at = excluded.updated_at"
    ).bind(BOOK, m, id, at));
  }
  if (stmts.length) await g.db.batch(stmts);
  return json({ ok: true, restored });
}
