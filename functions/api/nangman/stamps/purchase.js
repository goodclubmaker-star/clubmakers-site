// POST /api/nangman/stamps/purchase — credit paid stamps for an Apple-signed
// StoreKit 2 transaction. Body: {"signedTransaction": "<JWS>"}.
// The app finishes the StoreKit transaction only after a 200 from here.
// Stamps go to the account in Apple's signed appAccountToken (required); the
// caller's own account header only decides whether its wallet is returned.
// Production purchases go to 'paid' immediately, Sandbox ones to 'test'.
import { json, error, sha256Hex } from "../../../../lib/nangman-postcard.js";
import { stampAccount, ensureStampSchema, grantMonthly, stampBalance } from "../../../../lib/nangman-stamps.js";
import { verifyAppleJWS } from "../../../../lib/apple-jws.js";
import { checkTransaction, grantPurchase } from "../../../../lib/nangman-iap.js";

const STATUS = { conflict: 409 };

export async function onRequestPost({ request, env }) {
  if (!env?.DB) return error(503, "unavailable");
  const caller = await stampAccount(request);
  if (caller?.invalid) return error(400, "invalid");
  if (Number(request.headers.get("content-length") || 0) > 30000) return error(413, "too_large");

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
  const problem = checkTransaction(tx);
  if (problem) return json({ code: problem }, STATUS[problem] || 400);

  // Same hashing as stampAccount(): the buyer's ledger account.
  const buyer = await sha256Hex("nangman:stamps:v1:" + tx.appAccountToken.toLowerCase());
  await ensureStampSchema(env.DB);
  const now = Date.now();
  const result = await grantPurchase(env.DB, buyer, tx, now);
  if (result.conflict) return json({ code: "conflict" }, 409);
  if (result.refunded) return json({ code: "revoked" }, 400);
  const own = caller?.hash === buyer;
  if (own) await grantMonthly(env.DB, buyer, now, env);
  return json({
    granted: result.granted,
    credits: result.credits,
    test: tx.environment === "Sandbox",
    transactionId: tx.transactionId,
    ...(own ? { wallet: await stampBalance(env.DB, buyer, now, env) } : {}),
  });
}
