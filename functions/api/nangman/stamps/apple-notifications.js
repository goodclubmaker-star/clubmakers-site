// POST /api/nangman/stamps/apple-notifications — App Store Server Notifications V2.
// Set this URL in App Store Connect (both Production and Sandbox):
//   https://myclubmakers.com/api/nangman/stamps/apple-notifications
// Only REFUND changes the ledger; every other verified type is acknowledged.
import { json, error } from "../../../../lib/nangman-postcard.js";
import { ensureStampSchema } from "../../../../lib/nangman-stamps.js";
import { verifyAppleJWS } from "../../../../lib/apple-jws.js";
import { BUNDLE_ID, STAMP_PRODUCTS, applyRefund } from "../../../../lib/nangman-iap.js";

export async function onRequestPost({ request, env }) {
  if (!env?.DB) return error(503, "unavailable");
  const text = await request.text();
  if (text.length > 60000) return error(413, "too_large");
  let notification;
  try {
    notification = await verifyAppleJWS(JSON.parse(text)?.signedPayload);
  } catch {
    return error(400, "invalid");
  }
  const data = notification?.data;
  if (data?.bundleId !== BUNDLE_ID) return error(400, "invalid");

  if (notification.notificationType === "REFUND" && data.signedTransactionInfo) {
    let tx;
    try {
      tx = await verifyAppleJWS(data.signedTransactionInfo);
    } catch {
      return error(400, "invalid");
    }
    if (tx.bundleId !== BUNDLE_ID || !(tx.productId in STAMP_PRODUCTS)) return json({ ok: true });
    await ensureStampSchema(env.DB);
    const { refunded } = await applyRefund(env.DB, tx);
    return json({ ok: true, refunded });
  }
  return json({ ok: true });
}
