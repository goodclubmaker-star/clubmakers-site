// /api/studio/photo/:id — GET 사진 내용 (작업대 미리보기), DELETE 삭제
import { guard, json, fail } from "../../../../lib/studio.js";

export async function onRequestGet({ request, env, params }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  const r = await g.db.prepare("SELECT mime, b64 FROM studio_photos WHERE id = ?").bind(params.id).first();
  if (!r) return fail(404, "not_found", "사진이 없습니다.");
  const bin = Uint8Array.from(atob(r.b64), c => c.charCodeAt(0));
  return new Response(bin, { headers: { "content-type": r.mime, "cache-control": "private, max-age=3600", "x-robots-tag": "noindex" } });
}
export async function onRequestDelete({ request, env, params }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  await g.db.prepare("DELETE FROM studio_photos WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
