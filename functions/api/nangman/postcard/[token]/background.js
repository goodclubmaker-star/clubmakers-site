// GET /api/nangman/postcard/<token>/background — 손글씨를 뺀 엽서 배경 (§3.3)
import { error, keys, findActive, hasBindings } from "../../../../../lib/nangman-postcard.js";

export async function onRequestGet({ params, env }) {
  if (!hasBindings(env)) return error(503, "unavailable");
  const found = await findActive(env, params.token);
  if (found.response) return found.response;

  const object = await env.AUDIO.get(keys(found.idHash).background);
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
