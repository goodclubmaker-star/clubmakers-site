// GET    /api/nangman/postcard/<token> — 엽서 조회 (§3.2)
// DELETE /api/nangman/postcard/<token> — 공유 취소 (§3.4)
import {
  MANAGE_RE, SHARE_RE, error, json, keysFor, sha256Hex,
  findActive, purge, ensureSchema, hasBindings, sweepExpired, effectiveExpiry, isSealed,
} from "../../../../lib/nangman-postcard.js";

export async function onRequestGet({ params, env }) {
  if (!hasBindings(env)) return error(503, "unavailable");
  const token = params.token;
  const found = await findActive(env, token);
  // Opportunistic cleanup of other expired postcards (does not delay the answer much: max 25).
  await sweepExpired(env).catch(() => 0);
  if (found.response) return found.response;

  const object = await env.AUDIO.get(keysFor(found.idHash, found.row).meta);
  if (!object) return error(410, "expired");
  const meta = JSON.parse(await object.text());
  const opensAt = found.row.opens_at != null ? new Date(Number(found.row.opens_at)).toISOString() : null;

  // Not yet arrived: only the envelope facts, never the handwriting or picture.
  if (isSealed(found.row)) {
    return json({
      format: meta.format,
      version: meta.version,
      sealed: true,
      from: meta.from ?? null,
      opensAt,
      calendar: `/api/nangman/postcard/${token}/calendar`,
      createdAt: new Date(found.row.created_at).toISOString(),
      expiresAt: new Date(effectiveExpiry(found.row)).toISOString(),
    });
  }

  return json({
    format: meta.format,
    version: meta.version,
    from: meta.from ?? null,
    strokes: meta.strokes,
    background: `/api/nangman/postcard/${token}/background`,
    createdAt: new Date(found.row.created_at).toISOString(),
    expiresAt: new Date(effectiveExpiry(found.row)).toISOString(),
    ...(opensAt ? { opensAt } : {}),
  });
}

export async function onRequestDelete({ request, params, env }) {
  if (!hasBindings(env)) return error(503, "unavailable");
  const token = params.token;
  if (typeof token !== "string" || !SHARE_RE.test(token)) return error(404, "not_found");

  const auth = request.headers.get("authorization") || "";
  const manageToken = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!MANAGE_RE.test(manageToken)) return error(401, "unauthorized");

  await ensureSchema(env.DB);
  const idHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    "SELECT manage_hash, revoked_at FROM nangman_postcards WHERE id_hash = ?1"
  ).bind(idHash).first();
  if (!row) return error(404, "not_found");
  if (row.manage_hash !== (await sha256Hex(manageToken))) return error(401, "unauthorized");
  if (!row.revoked_at) await purge(env, idHash, Date.now(), "revoked_at");
  return json({ revoked: true });
}
