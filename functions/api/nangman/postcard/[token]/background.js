// GET /api/nangman/postcard/<token>/background — 손글씨를 뺀 엽서 배경 (§3.3)
import { error, keysFor, findActive, hasBindings, isSealed } from "../../../../../lib/nangman-postcard.js";

export async function onRequestGet({ params, env }) {
  if (!hasBindings(env)) return error(503, "unavailable");
  const found = await findActive(env, params.token);
  if (found.response) return found.response;
  if (isSealed(found.row)) return error(423, "sealed");

  const object = await env.AUDIO.get(keysFor(found.idHash, found.row).background);
  if (!object) return error(410, "expired");
  return new Response(object.body, {
    headers: {
      "content-type": "image/jpeg",
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
