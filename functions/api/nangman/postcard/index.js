// POST /api/nangman/postcard — 재생형 엽서 만들기 (docs/nangman-postcard-share.md §3.1)
import {
  CANVAS, LIMITS, TTL_MS, error, json, randomToken, sha256Hex, keys,
  validateMeta, jpegSize, readLimitedForm, ensureSchema, hasBindings,
  reserve, refusalReason, sweepExpired,
 } from "../../../../lib/nangman-postcard.js";
import {
  stampAccount, ensureStampSchema, grantMonthly, stampBalance,
  reserveStamped, refundStamped,
} from "../../../../lib/nangman-stamps.js";

export async function onRequestPost({ request, env }) {
  if (!hasBindings(env)) return error(503, "unavailable");

  // Hard cap on the whole body, also without Content-Length (chunked).
  const read = await readLimitedForm(request, LIMITS.requestBytes);
  if (read.code) return error(read.code === "too_large" ? 413 : 400, read.code);
  const form = read.form;

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
  const account = await stampAccount(request);
  if (account?.invalid) return error(400, "invalid");

  // An issued stamp's artwork is already baked into the uploaded background.
  // Keep only a catalog-safe identifier, never arbitrary user HTML or paths.
  const stamp = parsed.stamp == null ? null : parsed.stamp;
  if (stamp !== null && (typeof stamp !== "string" || !/^stamp-(0[1-9]|[12][0-9]|3[0-2])$/.test(stamp))) {
    return error(400, "invalid");
  }

  // Structurally valid JPEG of exactly the postcard size.
  const backgroundBytes = new Uint8Array(await background.arrayBuffer());
  const size = jpegSize(backgroundBytes);
  if (!size || size.width !== CANVAS.width || size.height !== CANVAS.height) return error(400, "invalid");

  await ensureSchema(env.DB);
  const now = Date.now();
  if (account?.hash) {
    await ensureStampSchema(env.DB);
    await grantMonthly(env.DB, account.hash, now, env);
  }
  // Delete expired content as we go (the R2 lifecycle rule is the backstop).
  await sweepExpired(env, now).catch(() => 0);

  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const ipHash = (await sha256Hex(`nangman-postcard:${ip}`)).slice(0, 32);
  const metaJson = JSON.stringify({ ...result.value, ...(stamp ? { stamp } : {}) });
  const token = randomToken(16);
  const manageToken = randomToken(32);
  const idHash = await sha256Hex(token);
  const row = {
    idHash,
    manageHash: await sha256Hex(manageToken),
    ipHash,
    bytes: new TextEncoder().encode(metaJson).length + backgroundBytes.length,
    expiresAt: now + TTL_MS,
  };

  // Rate limit + global caps checked and reserved in one atomic statement.
  const reserved = account?.hash
    ? await reserveStamped(env, row, account.hash, now)
    : await reserve(env, row, now);
  if (!reserved) {
    const wallet = account?.hash ? await stampBalance(env.DB, account.hash, now, env) : null;
    if (wallet && wallet.balance === 0) {
      // The hint must match what the wallet can actually offer right now.
      const error = wallet.canGetBonus
        ? "무료 우표를 다 사용했어요. 우표함에서 출시 기념 우표를 더 받아 주세요."
        : "우표를 다 사용했어요. 다음 달 1일에 무료 우표가 다시 들어와요.";
      return json({ code: "out_of_stamps", error }, 409);
    }
    const reason = await refusalReason(env, ipHash, now);
    return error(reason === "rate_limited" ? 429 : 507, reason);
  }

  const k = keys(idHash);
  try {
    await env.AUDIO.put(k.meta, metaJson, { httpMetadata: { contentType: "application/json" } });
    await env.AUDIO.put(k.background, backgroundBytes, { httpMetadata: { contentType: "image/jpeg" } });
  } catch {
    // No orphans: remove whatever was written and release the reservation.
    await env.AUDIO.delete([k.meta, k.background]).catch(() => {});
    if (account?.hash) {
      await refundStamped(env, idHash, now).catch(() => {});
    } else {
      await env.DB.prepare("DELETE FROM nangman_postcards WHERE id_hash = ?1").bind(idHash).run().catch(() => {});
    }
    return error(503, "unavailable");
  }

  const origin = new URL(request.url).origin;
  return json(
    {
      token,
      manageToken,
      url: `${origin}/nangman/postcard/?p=${token}`,
      expiresAt: new Date(row.expiresAt).toISOString(),
    },
    201
  );
}
