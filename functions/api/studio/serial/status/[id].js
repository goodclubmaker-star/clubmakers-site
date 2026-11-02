// POST /api/studio/serial/status/:id — 건너뛰기 / 되돌리기 {status: "skipped" | "todo"}
import { guard, json, fail, readJson, nowKst , BOOK } from "../../../../../lib/studio.js";

export async function onRequestPost({ request, env, params }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  const { body, error } = await readJson(request, 2000);
  if (error) return error;
  if (!["skipped", "todo"].includes(body?.status)) return fail(400, "invalid", "상태 값이 맞지 않습니다.");
  const at = nowKst();
  if (body.status === "skipped") {
    await g.db.prepare("INSERT INTO studio_progress (book, id, status, updated_at) VALUES (?, ?, 'skipped', ?) ON CONFLICT(book, id) DO UPDATE SET status = 'skipped', updated_at = excluded.updated_at")
      .bind(BOOK, params.id, at).run();
  } else {
    await g.db.prepare("UPDATE studio_progress SET status = CASE WHEN draft IS NOT NULL AND draft <> '' THEN 'reviewed' ELSE 'todo' END, updated_at = ? WHERE book = ? AND id = ?")
      .bind(at, BOOK, params.id).run();
  }
  return json({ ok: true });
}
