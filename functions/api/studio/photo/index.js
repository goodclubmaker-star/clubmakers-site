// /api/studio/photo — 작업대 사진 (브라우저에서 줄인 뒤 올림)
// POST {owner, mime, data(base64), name} → {id}    GET ?owner=… → 그 글의 사진 목록
import { guard, json, fail, readJson, nowKst } from "../../../../lib/studio.js";

const MIMES = ["image/jpeg", "image/png", "image/webp"];
export async function onRequestPost({ request, env }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  const { body, error } = await readJson(request, 2_600_000);
  if (error) return error;
  const owner = String(body?.owner || "").slice(0, 40);
  const mime = MIMES.includes(body?.mime) ? body.mime : null;
  const data = String(body?.data || "");
  if (!owner || !mime || !/^[A-Za-z0-9+/=]+$/.test(data) || data.length < 100) return fail(400, "invalid", "사진 형식이 맞지 않습니다.");
  if (data.length > 2_500_000) return fail(413, "too_large", "사진이 너무 큽니다.");
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  await g.db.prepare("INSERT INTO studio_photos (id, owner, mime, b64, name, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id, owner, mime, data, String(body?.name || "").slice(0, 120), nowKst()).run();
  return json({ ok: true, id });
}
export async function onRequestGet({ request, env }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  const owner = new URL(request.url).searchParams.get("owner") || "";
  const rows = (await g.db.prepare("SELECT id, name, created_at FROM studio_photos WHERE owner = ? ORDER BY created_at").bind(owner).all()).results;
  return json({ photos: rows });
}
