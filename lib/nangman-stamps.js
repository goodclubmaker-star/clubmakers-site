// Launch-period virtual postage ledger for Nangman Postcard.
// D1 is the source of truth; stamps are free, monthly and not carried forward.
// Account tokens are 122-bit UUIDv4 values kept in the iOS keychain.
// Never return or log the raw token. It is stored here only as a SHA-256 hash.
import { LIMITS, TTL_MS, sha256Hex } from "./nangman-postcard.js";

export const MONTHLY_FREE_STAMPS = 20;
export const STAMP_ACCOUNT_HEADER = "x-nangman-stamp-account";
const ACCOUNT_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function stampMonth(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 7);
}

export async function stampAccount(request) {
  const raw = request.headers.get(STAMP_ACCOUNT_HEADER);
  if (!raw) return null; // Old versions continue working during migration.
  if (!ACCOUNT_RE.test(raw)) return { invalid: true };
  return { hash: await sha256Hex("nangman:stamps:v1:" + raw.toLowerCase()) };
}

export async function ensureStampSchema(DB) {
  await DB.prepare(
    "CREATE TABLE IF NOT EXISTS nangman_stamp_ledger (" +
    "entry_id TEXT PRIMARY KEY, account_hash TEXT NOT NULL, month TEXT NOT NULL, " +
    "kind TEXT NOT NULL, delta INTEGER NOT NULL, postcard_hash TEXT, created_at INTEGER NOT NULL)"
  ).run();
  await DB.prepare(
    "CREATE INDEX IF NOT EXISTS idx_nangman_stamps_balance ON nangman_stamp_ledger(account_hash, month)"
  ).run();
}

export async function grantMonthly(DB, accountHash, now = Date.now()) {
  const month = stampMonth(now);
  await DB.prepare(
    "INSERT OR IGNORE INTO nangman_stamp_ledger " +
    "(entry_id, account_hash, month, kind, delta, created_at) " +
    "VALUES (?1, ?2, ?3, 'free_monthly', ?4, ?5)"
  ).bind("monthly:" + accountHash + ":" + month, accountHash, month, MONTHLY_FREE_STAMPS, now).run();
}

export async function stampBalance(DB, accountHash, now = Date.now()) {
  const month = stampMonth(now);
  const r = await DB.prepare(
    "SELECT COALESCE(SUM(delta),0) AS balance, " +
    "COALESCE(SUM(CASE WHEN kind = 'spend' THEN 1 ELSE 0 END),0) AS sent, " +
    "COALESCE(SUM(CASE WHEN kind = 'free_bonus' THEN delta ELSE 0 END),0) AS bonus " +
    "FROM nangman_stamp_ledger WHERE account_hash=?1 AND month=?2"
  ).bind(accountHash, month).first();
  return {
    month,
    balance: Math.max(0, Number(r?.balance || 0)),
    sent: Number(r?.sent || 0),
    bonus: Number(r?.bonus || 0),
    monthlyAllowance: MONTHLY_FREE_STAMPS,
    price: 0,
    canGetBonus: Number(r?.balance || 0) <= 0,
  };
}

/** Bonus is only issued at zero balance. A single conditional INSERT is race-safe. */
export async function grantBonus(DB, accountHash, now = Date.now()) {
  const month = stampMonth(now);
  const id = "bonus:" + crypto.randomUUID();
  await DB.prepare(
    "INSERT INTO nangman_stamp_ledger " +
    "(entry_id, account_hash, month, kind, delta, created_at) " +
    "SELECT ?1, ?2, ?3, 'free_bonus', ?4, ?5 " +
    "WHERE COALESCE((SELECT SUM(delta) FROM nangman_stamp_ledger WHERE account_hash=?2 AND month=?3),0) <= 0"
  ).bind(id, accountHash, month, MONTHLY_FREE_STAMPS, now).run();
  return stampBalance(DB, accountHash, now);
}

/**
 * D1 batch is a transaction. The same transaction checks IP/global limits and
 * available stamps while inserting the postcard reservation AND its debit.
 * Successful retries of the SAME link reuse it; each distinct upload costs 1.
 */
export async function reserveStamped(env, row, accountHash, now = Date.now()) {
  const month = stampMonth(now);
  const reservation = env.DB.prepare(
    "INSERT INTO nangman_postcards (id_hash, manage_hash, ip_hash, bytes, created_at, expires_at) " +
    "SELECT ?1, ?2, ?3, ?4, ?5, ?6 WHERE " +
    "(SELECT COUNT(*) FROM nangman_postcards WHERE ip_hash = ?3 AND created_at > ?7) < ?8 " +
    "AND (SELECT COALESCE(SUM(bytes), 0) FROM nangman_postcards WHERE purged_at IS NULL AND expires_at > ?5 AND created_at > ?11) + ?4 <= ?9 " +
    "AND (SELECT COUNT(*) FROM nangman_postcards WHERE purged_at IS NULL AND expires_at > ?5 AND created_at > ?11) < ?10 " +
    "AND (SELECT COALESCE(SUM(delta),0) FROM nangman_stamp_ledger WHERE account_hash=?12 AND month=?13) >= 1"
  ).bind(
    row.idHash, row.manageHash, row.ipHash, row.bytes, now, row.expiresAt,
    now - 3600000, LIMITS.createsPerHour, LIMITS.totalBytes, LIMITS.activeCount,
    now - TTL_MS, accountHash, month
  );
  const spend = env.DB.prepare(
    "INSERT INTO nangman_stamp_ledger " +
    "(entry_id, account_hash, month, kind, delta, postcard_hash, created_at) " +
    "SELECT ?1, ?2, ?3, 'spend', -1, ?4, ?5 FROM nangman_postcards WHERE id_hash=?4"
  ).bind("spend:" + row.idHash, accountHash, month, row.idHash, now);
  const [reserved, debited] = await env.DB.batch([reservation, spend]);
  return Number(reserved?.meta?.changes || 0) === 1 && Number(debited?.meta?.changes || 0) === 1;
}

/** Refund only an actually debited reservation; retry cannot refund twice. */
export async function refundStamped(env, idHash, now = Date.now()) {
  const refund = env.DB.prepare(
    "INSERT OR IGNORE INTO nangman_stamp_ledger " +
    "(entry_id, account_hash, month, kind, delta, postcard_hash, created_at) " +
    "SELECT ?1, account_hash, month, 'refund', 1, postcard_hash, ?2 " +
    "FROM nangman_stamp_ledger WHERE entry_id=?3 AND " +
    "EXISTS (SELECT 1 FROM nangman_postcards WHERE id_hash=?4)"
  ).bind("refund:" + idHash, now, "spend:" + idHash, idHash);
  const cleanup = env.DB.prepare("DELETE FROM nangman_postcards WHERE id_hash=?1").bind(idHash);
  await env.DB.batch([refund, cleanup]);
}
