// POST /api/studio/serial/status/:id — 완료(등록 없이) / 패스 / 되돌리기 {status: "done" | "skipped" | "todo", members?}
import { guard, json, fail, readJson, nowKst, resolveMembers, bundleStatements, BOOK } from "../../../../../lib/studio.js";

export async function onRequestPost({ request, env, params }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  const { body, error } = await readJson(request, 20000);
  if (error) return error;
  if (!["done", "skipped", "todo"].includes(body?.status)) return fail(400, "invalid", "상태 값이 맞지 않습니다.");
  const list = await resolveMembers(g.db, params.id, body?.members);
  if (!list) return fail(400, "invalid", "묶을 절 목록이 맞지 않습니다.");
  const at = nowKst();
  if (body.status !== "todo") {
    const st = body.status;
    await g.db.batch([
      g.db.prepare("INSERT INTO studio_progress (book, id, status, members, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(book, id) DO UPDATE SET status = excluded.status, members = excluded.members, lead = NULL, updated_at = excluded.updated_at")
        .bind(BOOK, params.id, st, list.length > 1 ? JSON.stringify(list) : null, at),
      ...bundleStatements(g.db, params.id, list, st, at),
    ]);
  } else {
    // 되돌리기: 묶음을 모두 풀고 각 절을 대기(검수본이 있으면 검수본) 상태로. 등록된 글은 그대로 둔다.
    await g.db.batch([
      g.db.prepare("UPDATE studio_progress SET lead = NULL, members = NULL, status = CASE WHEN status = 'published' THEN 'published' WHEN draft IS NOT NULL AND draft <> '' THEN 'reviewed' ELSE 'todo' END, updated_at = ? WHERE book = ? AND (id = ? OR lead = ?)")
        .bind(at, BOOK, params.id, params.id),
    ]);
  }
  return json({ ok: true });
}
