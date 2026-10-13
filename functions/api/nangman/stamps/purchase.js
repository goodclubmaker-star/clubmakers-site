// POST /api/nangman/stamps/purchase — credit paid stamps for an Apple-signed
// StoreKit 2 transaction. Body: {"signedTransaction": "<JWS>"}.
// The app finishes the StoreKit transaction only after a 200 from here.
import { json, error } from "../../../../lib/nangman-postcard.js";
import {
  STAMP_ACCOUNT_HEADER, stampAccount, ensureStampSchema, grantMonthly, stampBalance,
} from "../../../../lib/nangman-stamps.js";
import { verifyAppleJWS } from "../../../../lib/apple-jws.js";
import { checkTransaction, grantPurchase } from "../../../../lib/nangman-iap.js";

const STATUS = { not_for_sale: 403, wrong_account: 403, conflict: 409 };

export async function onRequestPost({ request, env }) {
  if (!env?.DB) return error(503, "unavailable");
  const account = await stampAccount(request);
  if (!account?.hash) return error(400, "invalid");
  const accountRaw = request.headers.get(STAMP_ACCOUNT_HEADER).toLowerCase();

  const text = await request.text();
  if (text.length > 30000) return error(413, "too_large");
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return error(400, "invalid");
  }

  let tx;
  try {
    tx = await verifyAppleJWS(body?.signedTransaction);
  } catch {
    return json({ code: "unverified" }, 400);
  }
  const problem = checkTransaction(tx, accountRaw, env);
  if (problem) return json({ code: problem }, STATUS[problem] || 400);

  await ensureStampSchema(env.DB);
  const now = Date.now();
  const result = await grantPurchase(env.DB, account.hash, tx, now);
  if (result.conflict) return json({ code: "conflict" }, 409);
  await grantMonthly(env.DB, account.hash, now, env);
  return json({
    granted: result.granted,
    credits: result.credits,
    transactionId: tx.transactionId,
    wallet: await stampBalance(env.DB, account.hash, now, env),
  });
}
