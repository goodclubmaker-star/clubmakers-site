// GET /api/nangman/stamps — remaining free stamps (no purchase offered yet)
import { json, error } from "../../../../lib/nangman-postcard.js";
import { stampAccount, ensureStampSchema, grantMonthly, stampBalance } from "../../../../lib/nangman-stamps.js";

export async function onRequestGet({ request, env }) {
  if (!env?.DB) return error(503, "unavailable");
  const account = await stampAccount(request);
  if (!account?.hash) return error(400, "invalid");
  await ensureStampSchema(env.DB);
  const now = Date.now();
  await grantMonthly(env.DB, account.hash, now);
  return json(await stampBalance(env.DB, account.hash, now));
}
