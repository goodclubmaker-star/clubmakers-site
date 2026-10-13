// Paid stamps: grant after Apple has signed the transaction, take back on refund.
// Signature/chain checks live in apple-jws.js; this file checks WHAT was bought
// and writes the ledger exactly once per Apple transaction.
import { stampMonth } from "./nangman-stamps.js";

export const BUNDLE_ID = "com.clubmakers.nangmanpostcard";
export const STAMP_PRODUCTS = {
  "com.clubmakers.nangmanpostcard.stamps10": 10,
  "com.clubmakers.nangmanpostcard.stamps30": 30,
  "com.clubmakers.nangmanpostcard.stamps100": 100,
};

/**
 * Sandbox purchases (App Review, TestFlight) are always honoured so review can
 * test the flow. Real-money Production purchases are credited only after the
 * owner sets STAMPS_PAID_ENABLED=true; until then the app keeps the transaction
 * unfinished and retries, so nothing a customer paid for is lost.
 */
export function environmentAllowed(environment, env = {}) {
  if (environment === "Sandbox") return true;
  if (environment === "Production") return env.STAMPS_PAID_ENABLED === "true";
  return false; // "Xcode" local StoreKit testing is not signed by Apple's root.
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates a decoded JWSTransaction. Returns null or an error code.
 * The buyer is the Apple-signed appAccountToken, not whoever posts the JWS,
 * so a purchase always lands on the account that paid for it.
 */
export function checkTransaction(tx, env = {}) {
  // appAccountToken may be absent (App Store promoted purchases, offer codes):
  // then the caller's own account is credited.
  if (!tx || typeof tx !== "object") return "invalid";
  if (tx.bundleId !== BUNDLE_ID) return "wrong_app";
  if (!(tx.productId in STAMP_PRODUCTS)) return "unknown_product";
  if (tx.type !== "Consumable") return "invalid";
  if (typeof tx.transactionId !== "string" || !/^[0-9]{1,30}$/.test(tx.transactionId)) return "invalid";
  if (tx.appAccountToken != null && (typeof tx.appAccountToken !== "string" || !UUID_V4.test(tx.appAccountToken))) {
    return "no_account";
  }
  if (tx.revocationDate) return "revoked";
  const quantity = tx.quantity ?? 1;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) return "invalid";
  if (!environmentAllowed(tx.environment, env)) return "not_for_sale";
  return null;
}

const key = (tx) => `${tx.environment}:${tx.transactionId}`;
const entryId = (tx) => `iap:${key(tx)}`;
// A refund (possibly a 0-stamp tombstone when it arrived first) blocks the
// purchase unless Apple later reversed that refund.
const REFUND_BLOCKS =
  "EXISTS (SELECT 1 FROM nangman_stamp_ledger WHERE entry_id=?6) " +
  "AND NOT EXISTS (SELECT 1 FROM nangman_stamp_ledger WHERE entry_id=?7)";

/**
 * Credits the paid pool once per Apple transaction. Retries are harmless:
 * the second call finds the same entry and reports granted=false.
 */
export async function grantPurchase(DB, accountHash, tx, now = Date.now()) {
  const credits = STAMP_PRODUCTS[tx.productId] * (tx.quantity ?? 1);
  const id = entryId(tx);
  const inserted = await DB.prepare(
    "INSERT OR IGNORE INTO nangman_stamp_ledger " +
    "(entry_id, account_hash, month, kind, delta, postcard_hash, created_at, pool) " +
    "SELECT ?1, ?2, ?3, 'purchase', ?4, NULL, ?5, 'paid' WHERE NOT (" + REFUND_BLOCKS + ")"
  ).bind(id, accountHash, stampMonth(now), credits, now,
    "iap_refund:" + key(tx), "iap_refund_reversed:" + key(tx)).run();
  if (Number(inserted?.meta?.changes || 0) === 1) return { granted: true, credits };
  const blocked = await DB.prepare(
    "SELECT 1 AS b WHERE " + REFUND_BLOCKS.replace("?6", "?1").replace("?7", "?2")
  ).bind("iap_refund:" + key(tx), "iap_refund_reversed:" + key(tx)).first();
  if (blocked) return { granted: false, credits: 0, refunded: true };
  const existing = await DB.prepare(
    "SELECT account_hash FROM nangman_stamp_ledger WHERE entry_id=?1"
  ).bind(id).first();
  // Same transaction already credited to another account: never credit twice.
  if (existing && existing.account_hash !== accountHash) return { granted: false, credits: 0, conflict: true };
  return { granted: false, credits: 0 };
}

/**
 * Apple refunded a purchase: remove exactly what that transaction added, once.
 * The paid balance may go below zero if the stamps were already used; it is
 * shown as 0 and paid sending stops until it is positive again.
 */
export async function applyRefund(DB, tx, now = Date.now()) {
  if (!tx || typeof tx.transactionId !== "string" || !tx.environment) return { refunded: false };
  const id = entryId(tx);
  const refundId = "iap_refund:" + key(tx);
  const r = await DB.prepare(
    "INSERT OR IGNORE INTO nangman_stamp_ledger " +
    "(entry_id, account_hash, month, kind, delta, postcard_hash, created_at, pool) " +
    "SELECT ?1, account_hash, ?2, 'purchase_refund', -delta, NULL, ?3, 'paid' " +
    "FROM nangman_stamp_ledger WHERE entry_id=?4 AND kind='purchase'"
  ).bind(refundId, stampMonth(now), now, id).run();
  if (Number(r?.meta?.changes || 0) === 1) return { refunded: true };
  // Refund before the purchase was ever credited: leave a 0-stamp tombstone
  // so an old copy of the transaction can't be credited afterwards.
  await DB.prepare(
    "INSERT OR IGNORE INTO nangman_stamp_ledger " +
    "(entry_id, account_hash, month, kind, delta, postcard_hash, created_at, pool) " +
    "VALUES (?1, 'refund-before-credit', ?2, 'purchase_refund', 0, NULL, ?3, 'paid')"
  ).bind(refundId, stampMonth(now), now).run();
  return { refunded: false };
}

/** Apple reversed a refund: give back exactly what the refund took, once. */
export async function reverseRefund(DB, tx, now = Date.now()) {
  if (!tx || typeof tx.transactionId !== "string" || !tx.environment) return { restored: false };
  const r = await DB.prepare(
    "INSERT OR IGNORE INTO nangman_stamp_ledger " +
    "(entry_id, account_hash, month, kind, delta, postcard_hash, created_at, pool) " +
    "SELECT ?1, account_hash, ?2, 'purchase_refund_reversed', -delta, NULL, ?3, 'paid' " +
    "FROM nangman_stamp_ledger WHERE entry_id=?4"
  ).bind("iap_refund_reversed:" + key(tx), stampMonth(now), now, "iap_refund:" + key(tx)).run();
  return { restored: Number(r?.meta?.changes || 0) === 1 };
}
