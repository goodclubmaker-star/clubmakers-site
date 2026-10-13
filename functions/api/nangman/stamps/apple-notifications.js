// POST /api/nangman/stamps/apple-notifications — App Store Server Notifications V2.
// Set this URL in App Store Connect (both Production and Sandbox):
//   https://myclubmakers.com/api/nangman/stamps/apple-notifications
// REFUND / REFUND_REVERSED change the ledger; every other verified type is
// acknowledged with 200 so Apple does not retry it.
import { json, error } from "../../../../lib/nangman-postcard.js";
import { ensureStampSchema } from "../../../../lib/nangman-stamps.js";
import { verifyAppleJWS } from "../../../../lib/apple-jws.js";
import { BUNDLE_ID, STAMP_PRODUCTS, applyRefund, reverseRefund } from "../../../../lib/nangman-iap.js";

export async function onRequestPost({ request, env }) {
  if (!env?.DB) return error(503, "unavailable");
  if (Number(request.headers.get("content-length") || 0) > 60000) return error(413, "too_large");
  const text = await request.text();
  if (text.length > 60000) return error(413, "too_large");
  let notification;
  try {
    notification = await verifyAppleJWS(JSON.parse(text)?.signedPayload);
  } catch {
    return error(400, "invalid");
  }
  const data = notification?.data;
  if (!data) return json({ ok: true }); // e.g. summary notifications
  if (data.bundleId !== BUNDLE_ID) return error(400, "invalid");

  const type = notification.notificationType;
  if ((type === "REFUND" || type === "REFUND_REVERSED") && data.signedTransactionInfo) {
    let tx;
    try {
      tx = await verifyAppleJWS(data.signedTransactionInfo);
    } catch {
      return error(400, "invalid");
    }
    if (tx.bundleId !== BUNDLE_ID || !(tx.productId in STAMP_PRODUCTS)) return json({ ok: true });
    await ensureStampSchema(env.DB);
    return json({ ok: true, ...(type === "REFUND" ? await applyRefund(env.DB, tx) : await reverseRefund(env.DB, tx)) });
  }
  return json({ ok: true });
}
