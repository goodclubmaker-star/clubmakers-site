// PUT /api/studio/serial/sections — 원고 교체 (작업대에서 docx를 나눈 결과)
// 진행 상태·검수본은 절 번호(id) 기준으로 그대로 유지된다.
import { guard, json, fail, readJson, nowKst, BOOK } from "../../../../lib/studio.js";

export async function onRequestPut({ request, env }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  const { body, error } = await readJson(request, 4_000_000);
  if (error) return error;
  const list = body?.sections;
  if (!Array.isArray(list) || list.length < 10 || list.length > 1000) return fail(400, "invalid", "원고를 나누지 못했습니다. 파일을 확인해 주세요.");
  for (const s of list) {
    if (!/^s\d{3,4}$/.test(s?.id) || typeof s.title !== "string" || typeof s.text !== "string" || typeof s.group !== "string")
      return fail(400, "invalid", "원고 형식이 맞지 않습니다.");
  }
  const db = g.db;
  const stmts = [db.prepare("DELETE FROM studio_sections WHERE book = ?").bind(BOOK)];
  list.forEach((s, i) => stmts.push(
    db.prepare("INSERT INTO studio_sections (book, id, ord, grp, title, body) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(BOOK, s.id, i, s.group.slice(0, 60), s.title.slice(0, 300), s.text)));
  stmts.push(db.prepare("INSERT INTO studio_books (book, source, count, uploaded_at) VALUES (?, ?, ?, ?) ON CONFLICT(book) DO UPDATE SET source = excluded.source, count = excluded.count, uploaded_at = excluded.uploaded_at")
    .bind(BOOK, String(body.source || "").slice(0, 200), list.length, nowKst()));
  await db.batch(stmts);
  return json({ ok: true, count: list.length });
}
