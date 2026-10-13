// POST /api/nangman/stamps/bonus — free 20 extra at zero balance.
// Limit on postcards remains 20 creates/hour per IP regardless of bonus credits.
import { json, error } from "../../../../lib/nangman-postcard.js";
import { stampAccount, ensureStampSchema, grantMonthly, grantBonus } from "../../../../lib/nangman-stamps.js";

export async function onRequestPost({ request, env }) {
  if (!env?.DB) return error(503, "unavailable");
  const account = await stampAccount(request);
  if (!account?.hash) return error(400, "invalid");
  const now = Date.now();
  await ensureStampSchema(env.DB);
  await grantMonthly(env.DB, account.hash, now);
  return json(await grantBonus(env.DB, account.hash, now));
}
