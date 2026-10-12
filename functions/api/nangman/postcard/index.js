// POST /api/nangman/postcard — 재생형 엽서 만들기 (docs/nangman-postcard-share.md §3.1)
import {
  LIMITS, TTL_MS, error, json, randomToken, sha256Hex, keys,
  validateMeta, isJpeg, ensureSchema, hasBindings,
} from "../../../../lib/nangman-postcard.js";

export async function onRequestPost({ request, env }) {
  if (!hasBindings(env)) return error(503, "unavailable");

  const length = Number(request.headers.get("content-length") || 0);
  if (length > LIMITS.requestBytes) return error(413, "too_large");

  let form;
  try {
    form = await request.formData();
  } catch {
    return error(400, "invalid");
  }

  const metaText = form.get("meta");
  const background = form.get("background");
  if (typeof metaText !== "string" || !background || typeof background === "string") {
    return error(400, "invalid");
  }
  if (new TextEncoder().encode(metaText).length > LIMITS.metaBytes) return error(413, "too_large");
  if (background.size > LIMITS.backgroundBytes) return error(413, "too_large");

  let parsed;
  try {
    parsed = JSON.parse(metaText);
  } catch {
    return error(400, "invalid");
  }
  const result = validateMeta(parsed);
  if (!result.ok) return error(result.code === "too_large" ? 413 : 400, result.code);

  const backgroundBytes = new Uint8Array(await background.arrayBuffer());
  if (!isJpeg(backgroundBytes)) return error(400, "invalid");

  await ensureSchema(env.DB);
  const now = Date.now();
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const ipHash = (await sha256Hex(`nangman-postcard:${ip}`)).slice(0, 32);

  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS c FROM nangman_postcards WHERE ip_hash = ?1 AND created_at > ?2"
  ).bind(ipHash, now - 60 * 60 * 1000).first();
  if ((recent?.c || 0) >= LIMITS.createsPerHour) return error(429, "rate_limited");

  const metaJson = JSON.stringify(result.value);
  const bytes = new TextEncoder().encode(metaJson).length + backgroundBytes.length;
  const usage = await env.DB.prepare(
    "SELECT COALESCE(SUM(bytes), 0) AS b, COUNT(*) AS c FROM nangman_postcards WHERE purged_at IS NULL"
  ).first();
  if ((usage?.b || 0) + bytes > LIMITS.totalBytes || (usage?.c || 0) >= LIMITS.activeCount) {
    return error(507, "storage_full");
  }

  const token = randomToken(16);
  const manageToken = randomToken(32);
  const idHash = await sha256Hex(token);
  const manageHash = await sha256Hex(manageToken);
  const k = keys(idHash);
  const expiresAt = now + TTL_MS;

  await env.AUDIO.put(k.meta, metaJson, { httpMetadata: { contentType: "application/json" } });
  await env.AUDIO.put(k.background, backgroundBytes, { httpMetadata: { contentType: "image/jpeg" } });
  try {
    await env.DB.prepare(
      "INSERT INTO nangman_postcards (id_hash, manage_hash, ip_hash, bytes, created_at, expires_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
    ).bind(idHash, manageHash, ipHash, bytes, now, expiresAt).run();
  } catch (e) {
    await env.AUDIO.delete([k.meta, k.background]);
    throw e;
  }

  const origin = new URL(request.url).origin;
  return json(
    {
      token,
      manageToken,
      url: `${origin}/nangman/postcard/?p=${token}`,
      expiresAt: new Date(expiresAt).toISOString(),
    },
    201
  );
}
